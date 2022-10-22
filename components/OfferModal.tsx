import { Lucid, Blockfrost } from "lucid-cardano";
import { useState, useEffect, useRef } from 'react';
import { useStoreActions, useStoreState } from "../utils/store";
import { useRouter } from 'next/router'
import Link from "next/link";
import { getAssets } from "../utils/cardano";
import NftGrid from "./NftGrid";
import GUN from 'gun'



const OfferModal = (props) => {
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
            formattedAssets[asset.assetId] = 1
        })
        return formatAssets
    }
    const makeOffer = async () => {
        const tx = await lucid.newTx()
            .addSigner(walletStore.address)
            .validTo(Date.now() + 432000000)
            .payToAddress(walletStore.address, formatAssets(selectedPeerAssets))
            .payToAddress(peerAddressInfo.address, { ...formatAssets(selectedSelfAssets), 'lovelace': BigInt(Number(adaOffer) * 1000000) })
            .complete();
        const signedTx = await tx.sign().complete();

        const index = new Date().toISOString()
        db.get('chat3')
            .get(walletStore.address)
            .get(peerAddressInfo.address)
            .get(index)
            .put({ message: signedTx.toString(), unsignedTx: tx.toString(), tx: true })
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

            <input type="checkbox" id="my-modalaaa" className="modal-toggle" />
            <div className="modal">
                <div className="modal-box">
                    <label htmlFor="my-modalaaa" className="btn btn-sm btn-circle absolute right-2 top-2">✕</label>
                    <h3 className="font-bold text-lg">Make an offer</h3>
                    <div className="tabs tabs-boxed">
                        <a onClick={() => { setSelectedTab("own") }} className={`tab ${selectedTab === "own" ? "tab-active" : ""}`}>Me</a>
                        <a onClick={() => { setSelectedTab("peer") }} className={`tab ${selectedTab === "peer" ? "tab-active" : ""}`}>Peer</a>
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

export default OfferModal;