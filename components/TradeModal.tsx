import { Lucid, Blockfrost, C, Core, assetsToValue, utxoToCore, TxComplete } from "lucid-cardano";
import { useState, useEffect, useRef } from 'react';
import { useStoreActions, useStoreState } from "../utils/store";
import { useRouter } from 'next/router'
import Link from "next/link";
import { getAssets } from "../utils/cardano";
import NftGrid from "./NftGrid";
import GUN from 'gun'



const TradeModal = (props) => {
    interface SignedMessage {
        key: string
        signature: string
        message: string
        index: string
    }

    const selectedPeerAssets = useStoreState(state => state.selectedPeerAssets)
    const selectedSelfAssets = useStoreState(state => state.selectedSelfAssets)
    const [db, setDb] = useState(undefined)
    const walletStore = useStoreState((state: any) => state.wallet)
    const peerAddressInfo = useStoreState((state: any) => state.peerAddress)

    const setPeerAddress = useStoreActions(actions => actions.setPeerAddress)
    const [lucid, setLucid] = useState(undefined)
    const [ownNfts, setOwnNfts] = useState([])
    const [peerNfts, setPeerNfts] = useState([])
    const [selectedTab, setSelectedTab] = useState("own")
    const [adaOffer, setAdaOffer] = useState(0)


    const initLucid = async (wallet: string) => {
        const api = (await window.cardano[
            wallet.toLowerCase()
        ].enable())

        const lucid = await Lucid.new(
            new Blockfrost('https://cardano-mainnet.blockfrost.io/api/v0', process.env.NEXT_PUBLIC_BLOCKFROST as string),
            'Mainnet')
        lucid.selectWallet(api)
        setLucid(lucid)
        return lucid;
    }

    const formatAssets = (assetList) => {
        var formattedAssets = {}
        assetList.map((asset) => {
            formattedAssets[asset.assetId] = BigInt(1)
        })

        return formattedAssets
    }

    const makeOffer = async () => {
        try {
            const tx = await lucid.newTx()
                .addSigner(walletStore.address)
                .addSigner(peerAddressInfo.address)
            //.validTo(Date.now() + 432000000)

            var utxosPeer = await lucid.utxosAt(peerAddressInfo.address);
            const corePeerUtxos = C.TransactionUnspentOutputs.new();
            utxosPeer.forEach((utxo) => {
                corePeerUtxos.add(utxoToCore(utxo));
            });
 
            tx.payToAddress(walletStore.address, { ...formatAssets(selectedPeerAssets) })

            tx.txBuilder.add_inputs_from(corePeerUtxos, C.Address.from_bech32(peerAddressInfo.address));
            console.log("inputs added")
            tx.txBuilder.balance(C.Address.from_bech32(peerAddressInfo.address))

            tx.payToAddress(peerAddressInfo.address, { ...formatAssets(selectedSelfAssets) })

            if (adaOffer > 0) {
                tx.payToAddress(peerAddressInfo.address, { 'lovelace': BigInt(Number(adaOffer) * 1000000) })
            }
            const txComplete =await tx.complete()
            console.log("added inputs")
            //const signedTx = await txComplete.partialSign()
            const signedTx = await txComplete.sign().complete()
            const index = new Date().toISOString()
            db.get('chat3')
                .get(walletStore.address)
                .get(peerAddressInfo.address)
                .get(index)
                .put({ message: signedTx.toString(), unsignedTx: tx.toString(), tx: true })
        }
        catch (err) {
            window.alert(err)
        }
    }

    useEffect(() => {
        initLucid(walletStore.name)
        getAssets(walletStore.address)
            .then((res) => { setOwnNfts(res.addressInfo.nfts) })
        getAssets(props.peer)
            .then((res) => { setPeerNfts(res.addressInfo.nfts); setPeerAddress({ address: props.peer, balance: res.addressInfo.balance }) })
    }, [])

    useEffect(() => {
        if (lucid) {
            setDb(GUN(["https://gun-server-1.glitch.me/gun"]))
        }
    }, [lucid])

    return (
        <>

            <label htmlFor="my-modal" className="btn modal-button px-10 btn-secondary">Request Trade</label>

            <input type="checkbox" id="my-modal" className="modal-toggle" />
            <div className="modal">
                <div className="modal-box">
                    <label htmlFor="my-modal" className="btn btn-sm btn-circle absolute right-2 top-2">✕</label>
                    <h3 className="font-bold text-lg">Make an offer</h3>
                    <div className="tabs tabs-boxed">
                        <a onClick={() => { setSelectedTab("peer") }} className={`tab ${selectedTab === "peer" ? "tab-active" : ""}`}>Peer</a>
                        <a onClick={() => { setSelectedTab("own") }} className={`tab ${selectedTab === "own" ? "tab-active" : ""}`}>Me</a>
                    </div>
                    {
                        selectedTab === "own" &&
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Enter amount</span>
                            </label>
                            <label className="input-group">
                                <input onChange={(e) => { setAdaOffer(parseInt(e.target.value)) }} value={adaOffer} type="number" placeholder="0.01" className="input input-bordered" />
                                <span>ADA</span>
                                <button onClick={() => { makeOffer() }} className="btn btn-info ml-5">Send Offer</button>

                            </label>
                        </div>
                    }
                    <NftGrid type={selectedTab} nfts={selectedTab === "own" ? ownNfts : peerNfts} />

                </div>
            </div>
        </>
    )

}

export default TradeModal;