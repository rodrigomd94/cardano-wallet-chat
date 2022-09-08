import { Lucid, Blockfrost, utf8ToHex, C } from "lucid-cardano";
import { useState, useEffect, useRef } from 'react';
import { useStoreActions, useStoreState } from "../utils/store";
import { useRouter } from 'next/router'

import GUN from 'gun'

const Chat = (props) => {
    const router = useRouter()
    const {peer} = router.query

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
    const lucid = useStoreState(state => state.lucid)

    useEffect(() => {
        var outgoingMessages2 = []
        var incomingMessages2 = []
        var allMessages2 = []
        if (db && walletStore.address !== "") {
            console.log(walletStore.address)
            console.log("getting chat")
            db.get('chat3')
                .get(walletStore.address)
                .get(peer)
                .map()
                .on(async (data, id) => {
                    console.log(data)
                    if (data) {
                        if (await verifyMessage(data, walletStore.address)) {   
                            outgoingMessages2 = [...outgoingMessages2.slice(-40), data]
                            allMessages2 = [...allMessages2.slice(-40), { data, origin: "outgoing" }]
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
                .on(async (data, id) => {
                    console.log(data)
                    if (data) {
                        if (await verifyMessage(data, peer)) {
                            incomingMessages2 = [...incomingMessages2.slice(-40), data]
                            allMessages2 = [...allMessages2.slice(-40), { data, origin: "incoming" }]
                            sortMessages(allMessages2)
                            setAllMessages(sortMessages(allMessages2))
                            setIncomingMessages(incomingMessages2)
                        }
                    }
                })

        } else if (walletStore.address !== "") {
            setDb(GUN())
        }
    }, [db, walletStore.address, props])

    const verifyMessage = (message: SignedMessage, address: string) => {
        const payload = utf8ToHex(message.message);
        const hasSigned: boolean = lucid.verifyMessage(address, payload, { key: message.key, signature: message.signature })
        if(!hasSigned){
            console.log(hasSigned, payload)
        }
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

            <div className="mockup-window p-10 border border-base-300" style={{ height: '80vh' }} >
            <div className="center">you : {walletStore.address}</div>
                <div className="center">peer : {peer}</div>

                {/* {outgoingMessages.map((message) => <div className="flex justify-right px-4 py-5">{message.message}</div>)} */}

                {allMessages.map((message) => {
                    if (message.origin === "incoming") {
                        return <div className="flex justify-left px-4 py-5">{message.data.message}</div>
                    } else if(message.origin === "outgoing") {
                        return <div className="flex justify-end px-4 py-5">{message.data.message}</div>
                    }
                }
                )}

                <div className="form-control mb-10 absolute bottom-10 w-1/2">
                    <div className="input-group w-full">
                        <input onChange={(e) => { setCurrentMessage(e.target.value) }} type="text" placeholder="Enter message..." className="input input-bordered w-full" value={currentMessage} />
                        <button className="btn btn-square" onClick={() => { sendMessage() }}>
                            Send
                        </button>
                    </div>
                </div>
            </div>


        </>
    )

}

export default Chat;