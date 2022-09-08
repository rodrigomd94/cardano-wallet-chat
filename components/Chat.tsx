import { Lucid, Blockfrost, utf8ToHex, C } from "lucid-cardano";
import { useState, useEffect, useRef } from 'react';
import { useStoreActions, useStoreState } from "../utils/store";
import { useRouter } from 'next/router'
import ChatList from "./ChatList";

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
        if (db && walletStore.address !== "" && lucid && peer) {
            db.get('chat3')
                .get(walletStore.address)
                .map()
                .once((data, index) => {
                    console.log(data, index)
                })
            console.log(walletStore.address)
            console.log("getting chat")
            db.get('chat3')
                .get(walletStore.address)
                .get(peer)
                .map()
                .once(async (data, id) => {
                    if (data) {
                        if (await verifyMessage(data, walletStore.address)) {
                            outgoingMessages2 = [...outgoingMessages2.slice(-6), data]
                            allMessages2 = [...allMessages2.slice(-6), { data, origin: "outgoing" }]
                            sortMessages(allMessages2)
                            console.log(allMessages2)
                            setAllMessages(sortMessages(allMessages2))
                            setOutgoingMessages(outgoingMessages2)
                        }
                    }
                })
            db.get('chat3')
                .get(peer)
                .get(walletStore.address)
                .map()
                .once(async (data, id) => {
                    if (data) {
                        if (await verifyMessage(data, peer as string)) {
                            incomingMessages2 = [...incomingMessages2.slice(-6), data]
                            allMessages2 = [...allMessages2.slice(-6), { data, origin: "incoming" }]
                            sortMessages(allMessages2)
                            console.log(allMessages2)
                            setAllMessages(sortMessages(allMessages2))
                            setIncomingMessages(incomingMessages2)
                        }
                    }
                })

        } else if (lucid && peer) {
            setDb(GUN(["https://gun-server-1.glitch.me/gun"]))
        }
    }, [db, walletStore.address, lucid, peer])

    useEffect(() => {
        if (walletStore.name !== "") {
            initLucid(walletStore.name)
        }

    }, [walletStore.name])

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
                    .get(peer)
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
                    <div className="mockup-window p-10 border border-base-300" style={{ height: '80vh' }} >
                        <div className="center font-bold">You : {walletStore.address}</div>
                        <div className="center font-bold secondary">Peer : {peer}</div>

                        {/* {outgoingMessages.map((message) => <div className="flex justify-right px-4 py-5">{message.message}</div>)} */}

                        {allMessages.map((message, index) => {
                            if (message.origin === "incoming") {
                                return <div key={index} className="flex justify-left px-4 py-5 text-secondary">{message.data.message}</div>
                            } else if (message.origin === "outgoing") {
                                return <div key={index} className="flex justify-end px-4 py-5 text-primary">{message.data.message}</div>
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