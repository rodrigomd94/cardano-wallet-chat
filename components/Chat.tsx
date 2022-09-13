import { Lucid, Blockfrost, utf8ToHex, C } from "lucid-cardano";
import { useState, useEffect, useRef } from 'react';
import { useStoreActions, useStoreState } from "../utils/store";
import { useRouter } from 'next/router'
import ChatList from "./ChatList";
import { queryHandle, handleFromAddress } from "../utils/handles";
import GUN from 'gun'
import TradeModal from "./TradeModal";
import Link from "next/link";
import { TransactionHash, Vkeywitness, VRFKeyHash } from "lucid-cardano/types/src/core/wasm_modules/cardano_multiplatform_lib_web/cardano_multiplatform_lib";

const Chat = (props) => {
    const router = useRouter()
    const { peer } = router.query
    interface SignedMessage {
        key: string
        signature: string
        message: string
        index: string
        tx?: boolean
        unsignedTx?: string
    }
    const [db, setDb] = useState(undefined)
    const walletStore = useStoreState((state: any) => state.wallet)
    //const concatAddress = [peer, walletStore.address].sort().join("")
    const [outgoingMessages, setOutgoingMessages] = useState([])
    const [incomingMessages, setIncomingMessages] = useState([])
    const [allMessages, setAllMessages] = useState([])

    const [currentMessage, setCurrentMessage] = useState("")
    const [lucid, setLucid] = useState(undefined)
    const [peerAddress, setPeerAddress] = useState("")
    const [handles, setHandles] = useState([])

    const [showTxModal, setShowTxModal] = useState(false)
    const [txInfoMessage, setTxInfoMessage] = useState("")

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

    function verifySignature(txHash: TransactionHash, vkeywitness: Vkeywitness): boolean {
        const publicKey = vkeywitness.vkey().public_key()
        const signature = vkeywitness.signature()
        return publicKey.verify(txHash.to_bytes(), signature)
    }

    useEffect(() => {
        var outgoingMessages2 = []
        var incomingMessages2 = []
        var allMessages2 = []
        if (db && walletStore.address !== "" && lucid && peerAddress !== "") {

            db.get('chat3')
                .get(walletStore.address)
                .get(peerAddress)
                .map()
                .once(async (data, id) => {
                    if (data) {
                        if (await verifyMessage(data, walletStore.address)) {
                            outgoingMessages2 = [...outgoingMessages2.slice(-6), data]
                            allMessages2 = [...allMessages2.slice(-6), { data, origin: "outgoing", timestamp: id }]
                            sortMessages(allMessages2)
                            setAllMessages(sortMessages(allMessages2))
                            setOutgoingMessages(outgoingMessages2)
                        }
                    }
                })
            db.get('chat3')
                .get(peerAddress)
                .get(walletStore.address)
                .map()
                .once(async (data, id) => {
                    if (data) {
                        if (await verifyMessage(data, peerAddress)) {
                            incomingMessages2 = [...incomingMessages2.slice(-6), data]
                            allMessages2 = [...allMessages2.slice(-6), { data, origin: "incoming", timestamp: id }]
                            sortMessages(allMessages2)
                            setAllMessages(sortMessages(allMessages2))
                            setIncomingMessages(incomingMessages2)
                        }
                    }
                })

        } else if (lucid && peer) {
            setDb(GUN(["https://gun-server-1.glitch.me/gun", "http://5.189.177.177:8765/gun"]))
        }
    }, [db, walletStore.address, lucid, peerAddress])

    useEffect(() => {
        if (walletStore.name !== "") {
            initLucid(walletStore.name)
            setAllMessages([])
        }

    }, [walletStore.name])

    useEffect(() => {
        setAllMessages([])
        handleFromAddress(walletStore.address)

        if (peer && (peer as string).startsWith("$")) {
            queryHandle((peer as string).replace("$", ""))
                .then((address) => {
                    setPeerAddress(address)
                })
        } else if (peer) {
            setPeerAddress(peer as string)
            handleFromAddress(peer as string)
                .then((handlesRes) => {
                    setHandles(handlesRes)
                })
        }
    }, [peer])

    const verifyMessage = async (message: SignedMessage, address: string) => {
        if (message.tx) {
            const transaction = C.Transaction.from_bytes(Buffer.from(message.message, 'hex'));
            var isValid = false;
            try {
                let vkey = JSON.parse(transaction.witness_set().to_json()).vkeys[0].vkey
                const pubkeyHash = C.PublicKey.from_bech32(vkey).hash().to_hex()
                const addrKeyHash = C.Address.from_bech32(address).as_base().payment_cred().to_keyhash().to_hex()
                isValid = pubkeyHash === addrKeyHash
               // console.log(isValid, JSON.parse(transaction.witness_set().to_json()))

            } catch (err) {
                isValid = false
                // console.log(err)
            }

            return isValid

        } else {
            const payload = utf8ToHex(message.message);
            const hasSigned: boolean = lucid.verifyMessage(address, payload, { key: message.key, signature: message.signature })
            return hasSigned
        }
    }

    const openSignOffer = async (txHex: string) => {
        const transaction = C.Transaction.from_bytes(Buffer.from(txHex, 'hex'));
        const tx = lucid.fromTx(txHex)
        const signedTx = await tx.sign().complete()
        const txHash = await signedTx.submit();
        setTxInfoMessage(txHash)
        setShowTxModal(true)
        console.log(txHash);
    }

    const openOffer = async (txHex: string) => {
        const transaction = C.Transaction.from_bytes(Buffer.from(txHex, 'hex'));
        const tx = lucid.fromTx(txHex)
        const signedTx = await tx.sign().complete()
        // const txHash = await signedTx.submit();
    }

    const sortMessages = (messages: any[]) => {
        let newMessages = messages
        newMessages.sort((a, b) => {
            return Date.parse(a.data.index) - Date.parse(b.data.index)
        });
        return newMessages
    }
    const sendMessage = async () => {
        if (lucid) {
            const address = await lucid.wallet.address()
            const payload = utf8ToHex(currentMessage);
            const signedMessage = await lucid.newMessage(address, payload).sign()

            const index = new Date().toISOString()
            signedMessage.message = currentMessage;
            signedMessage.index = new Date().toISOString()
            if (currentMessage !== "") {
                db.get('chat3')
                    .get(walletStore.address)
                    .get(peerAddress)
                    .get(index)
                    .put(signedMessage)
                setCurrentMessage("")
            }
        } else {
            console.log("Wallet not connected")
        }
    }

    return (
        <>
            {peer && db &&
                <>
                    <div className="mockup-window p-10 border " style={{ height: '80vh' }} >
                        <div className="center font-bold">You : {walletStore.address}</div>
                        <div className="center font-bold secondary">Peer : {handles.length === 0 ? peer : handles.join(' / ')}</div>

                        {/* {outgoingMessages.map((message) => <div className="flex justify-right px-4 py-5">{message.message}</div>)} */}

                        {allMessages.map((message, index) => {
                            if (message.origin === "incoming") {
                                if (message.data.tx) {
                                    return <div key={index} className="mt-5 flex justify-left" >
                                        <button onClick={() => { openSignOffer(message.data.message) }} className="btn btn-outline btn-accent btn-sm">View Trade Offer</button>
                                    </div>
                                } else {
                                    return <div key={index} className="mt-5" >
                                        <div className="tooltip tooltip-right z-10" data-tip={message.timestamp}>
                                            <div className="flex justify-left px-4 text-secondary" >{message.data.message}</div>
                                        </div>
                                    </div>
                                }
                            } else if (message.origin === "outgoing") {
                                if (message.data.tx) {
                                    return <div key={index} className="mt-5 flex justify-end" >
                                        <button onClick={() => { openOffer(message.data.message) }} className="btn btn-outline btn-info btn-xs">View Your Offer</button>
                                    </div>
                                } else {
                                    return <div key={index} className="mt-5 flex justify-end" >
                                        <div className="tooltip tooltip-left z-10" data-tip={message.timestamp}>
                                            <div className="flex justify-end px-4 text-accent">{message.data.message}</div>
                                        </div>
                                    </div>
                                }
                            }
                        }
                        )}

                    </div>


                    <input type="checkbox" id="txModal" className="modal-toggle" checked={showTxModal}/>
                    <div className="modal">
                        <div className="modal-box relative">
                            <label onClick={()=>{setShowTxModal(false)}} htmlFor="txModal" className="btn btn-sm btn-circle absolute right-2 top-2">✕</label>
                            <h3 className="text-lg font-bold">Transaction info</h3>
                            <p className="py-4">{txInfoMessage}</p>
                        </div>
                    </div>



                    <div className="input-group w-full my-5">
                        <input onChange={(e) => { setCurrentMessage(e.target.value) }} type="text" placeholder="Enter message..." className="input input-bordered w-full" value={currentMessage} />
                        <button className="btn btn-square" onClick={() => { sendMessage() }}>
                            Send
                        </button>
                        <TradeModal peer={peerAddress} />

                    </div>

                </>
            }
            {
                !peer &&
                <ChatList />
            }
            {
                !db && peer && <div>Loading ...</div>
            }
        </>
    )

}

export default Chat;