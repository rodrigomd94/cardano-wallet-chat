import { createTypedHooks } from 'easy-peasy';
import { Action, action } from 'easy-peasy';
import { createStore } from 'easy-peasy';

interface WalletStore { connected: boolean, name: string, address: string }

interface StoreModel {
  wallet: WalletStore
  setWallet: Action<StoreModel, WalletStore>
  availableWallets: string[]
  setAvailableWallets: Action<StoreModel, string[]>
  lucid: any,
  setLucid: Action<any, any>
}

const model: StoreModel = {
  wallet: { connected: false, name: '', address: '' },
  setWallet: action((state, newWallet) => { state.wallet = newWallet }),
  availableWallets: [],
  setAvailableWallets: action((state, newAvailableWallets) => { state.availableWallets = newAvailableWallets }),
  lucid: undefined,
  setLucid: action((state, newLucid) => { state.lucid = newLucid }),
}

const store = createStore(model)
export default store


const { useStoreActions, useStoreState, useStoreDispatch, useStore } = createTypedHooks<StoreModel>()

export {
  useStoreActions,
  useStoreState,
  useStoreDispatch,
  useStore
}