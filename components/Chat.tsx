import { Lucid, Blockfrost, utf8ToHex, C } from "lucid-cardano";
import { useState, useEffect, useRef } from 'react';
import { useStoreActions, useStoreState } from "../utils/store";
import { useRouter } from 'next/router'
import ChatList from "./ChatList";
import { queryHandle, handleFromAddress } from "../utils/handles";

import GUN from 'gun'

const Chat = (props) => {
    const router = useRouter()
    const { peer } = router.query
    interface SignedMessage {
        key: string
        signature: string
        message: string
        index: string
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


    


    useEffect(() => {
        var outgoingMessages2 = []
        var incomingMessages2 = []
        var allMessages2 = []
        if (db && walletStore.address !== "" && lucid && peerAddress !== "") {
            console.log("here", peerAddress)

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
            setDb(GUN(["https://gun-server-1.glitch.me/gun"]))
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
            .then((handlesRes) =>{
                setHandles(handlesRes)
            })
        }
    }, [peer])

    const verifyMessage = (message: SignedMessage, address: string) => {
        const payload = utf8ToHex(message.message);
        const hasSigned: boolean = lucid.verifyMessage(address, payload, { key: message.key, signature: message.signature })
        return hasSigned
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
                console.log(walletStore.address)
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
                        <div className="center font-bold secondary">Peer : {handles.length === 0 ? peer : handles.join(' / ') }</div>

                        {/* {outgoingMessages.map((message) => <div className="flex justify-right px-4 py-5">{message.message}</div>)} */}

                        {allMessages.map((message, index) => {
                            if (message.origin === "incoming") {
                                return <div key={index} className="mt-5" >
                                    <div className="tooltip tooltip-right z-10" data-tip={message.timestamp}>
                                        <div className="flex justify-left px-4 text-secondary" >{message.data.message}</div>
                                    </div>
                                </div>
                            } else if (message.origin === "outgoing") {
                                return <div key={index} className="mt-5 flex justify-end" >
                                    <div className="tooltip tooltip-left z-10" data-tip={message.timestamp}>
                                        <div className="flex justify-end px-4 text-accent">{message.data.message}</div>
                                    </div>
                                </div>


                            }
                        }
                        )}


                    </div>
                    <div className="input-group w-full my-5">
                        <input onChange={(e) => { setCurrentMessage(e.target.value) }} type="text" placeholder="Enter message..." className="input input-bordered w-full" value={currentMessage} />
                        <button className="btn btn-square" onClick={() => { sendMessage() }}>
                            Send
                        </button>
                    </div>
                </>
            }
            {!peer &&
                <ChatList />
            }
            {
                !db && peer && <div>Loading ...</div>
            }
        </>
    )

}

export default Chat;