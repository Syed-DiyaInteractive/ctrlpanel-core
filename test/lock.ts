import _ = require('./_shims')

import assert = require('assert')

import MockApiClient from './_api-client'
import MockStorage from './_storage'

import Core, { State } from '../src/core'

const acc1Id = '86ee6a06-7112-4bb6-bf41-fbf02ba32bc2'
const acc1Data = { hostname: 'example.com', handle: 'Test', password: 'och-dWB-ea3-PKR' }

const acc2Id = 'f2e7b12b-b6e6-4d6c-b732-4778b7c0685b'
const acc2Data = { hostname: 'google.com', handle: 'LinusU', password: 'LGp-HeA-hKm-ag7' }

describe('Lock / Unlock', () => {
  let core: Core
  let state: State

  const handle = Core.randomHandle()
  const secretKey = Core.randomSecretKey()
  const masterPassword = Core.randomMasterPassword()

  before(() => {
    core = Object.assign(new Core(), {
      apiClient: new MockApiClient(),
      storage: new MockStorage(),
    })

    state = core.init()
  })

  before('signup', async function () {
    this.timeout(10000)
    this.slow(1300)

    if (state.kind !== 'empty') throw new Error('Expected an empty state')

    state = await core.signup(state, { handle, secretKey, masterPassword }, false)
    state = await core.createAccount(state, acc1Id, acc1Data)
    state = await core.createAccount(state, acc2Id, acc2Data)
  })

  it('locks and unlocks', async function () {
    this.timeout(10000)
    this.slow(1300)

    if (state.kind !== 'connected') throw new Error('Expected a connected state')

    assert.strictEqual(state.decryptedEntries.length, 2)
    assert.deepStrictEqual(core.getParsedEntries(state), { accounts: { [acc1Id]: acc1Data, [acc2Id]: acc2Data }, inbox: {} })

    state = await core.lock(state)

    assert.strictEqual(state.kind, 'locked')
    assert.strictEqual((state as any).decryptedEntries, undefined)

    state = await core.unlock(state, { masterPassword })

    if (state.kind !== 'connected') throw new Error('Expected a connected state')

    assert.strictEqual(state.decryptedEntries.length, 0)
    assert.deepStrictEqual(core.getParsedEntries(state), { accounts: {}, inbox: {} })

    state = await core.sync(state)

    assert.strictEqual(state.decryptedEntries.length, 2)
    assert.deepStrictEqual(core.getParsedEntries(state), { accounts: { [acc1Id]: acc1Data, [acc2Id]: acc2Data }, inbox: {} })
  })
})
