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
                // .payToAddress(walletStore.address,  { ...formatAssets(selectedPeerAssets), 'lovelace': BigInt(1900000) })
                .payToAddress(peerAddressInfo.address, { ...formatAssets(selectedSelfAssets), 'lovelace': BigInt(Number(adaOffer) * 1000000) })
            // .complete();

            console.log(tx.txBuilder)
            const utxosSelf = await tx.lucid.wallet.getUtxosCore();
            var utxosPeer = await lucid.utxosAt(peerAddressInfo.address);
            const corePeerUtxos = C.TransactionUnspentOutputs.new();
            utxosPeer.forEach((utxo) => {
                corePeerUtxos.add(utxoToCore(utxo));
            });
            console.log(utxosSelf.get(0).output().to_json())
            console.log(walletStore.address)
            tx.txBuilder.add_inputs_from(utxosSelf, C.Address.from_bech32(walletStore.address));
            tx.txBuilder.balance(C.Address.from_bech32(walletStore.address))
            console.log("added inpiutsx")

            if (selectedPeerAssets.length != 0) {
                const output = C.TransactionOutput.new(
                    C.Address.from_bech32(walletStore.address),
                    assetsToValue({ ...formatAssets(selectedPeerAssets) }),
                );
                    console.log(output.to_json())
                tx.txBuilder.add_output(output)

                tx.txBuilder.add_inputs_from(corePeerUtxos, C.Address.from_bech32(peerAddressInfo.address));
                console.log("inpiuts added")
 
                tx.txBuilder.balance(C.Address.from_bech32(peerAddressInfo.address))
            }

            const txComplete = new TxComplete(
                lucid,
                await tx.txBuilder.construct(utxosSelf, C.Address.from_bech32(walletStore.address)),
            );
            console.log(txComplete.toObject())
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
            setDb(GUN(["https://gun-server-1.glitch.me/gun","https://adao-gunjs1.herokuapp.com/","http://5.189.177.177:8765/gun"]))
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
                    {/* <p className="py-4">You've been selected for a chance to get one year of subscription to use Wikipedia for free!</p>
                    <div className="modal-action">
                        <label htmlFor="my-modal" className="btn">Yay!</label>
                    </div> */}
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