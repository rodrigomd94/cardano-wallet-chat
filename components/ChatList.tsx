import { Lucid, Blockfrost, utf8ToHex, C } from "lucid-cardano";
import { useState, useEffect, useRef } from 'react';
import { useStoreActions, useStoreState } from "../utils/store";
import { useRouter } from 'next/router'
import Link from "next/link";
import { handleFromAddress } from "../utils/handles";

import GUN from 'gun'

const ChatList = (props) => {
    const router = useRouter()
    interface SignedMessage {
        key: string
        signature: string
        message: string
        index: string
    }

    const [db, setDb] = useState(undefined)
    const walletStore = useStoreState((state: any) => state.wallet)
    const [allPeers, setAllPeers] = useState([])
    const [lucid, setLucid] = useState(undefined)
    const [peerAddress, setPeerAddress] = useState("")

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
        var allPeers2 = []
        if (db && walletStore.address !== "" && lucid) {
            console.log(walletStore.address)

            db.get('chat3')
                .map()
                .once(async (data, index) => {
                    console.log(data, index)

                    Object.keys(data).map((key) => {
                        if (index === walletStore.address && key.startsWith("addr")) {
                            handleFromAddress(key)
                                .then((handles: string[]) => {
                                    if (handles.length > 0) {
                                        allPeers2.push({ address: key, handles: handles.join(" / ") })
                                    } else {
                                        allPeers2.push({ address: key, handles: "" })
                                    }
                                    let uniqueObjArray = [...new Map(allPeers2.map((item) => [item["address"], item])).values()];
                                    setAllPeers(uniqueObjArray)
                                })
                        }
                        else if (key === walletStore.address) {
                            handleFromAddress(index)
                                .then((handles: string[]) => {
                                    if (handles.length > 0) {
                                        allPeers2.push({ address: index, handles: handles.join(" / ") })
                                    } else {
                                        allPeers2.push({ address: index, handles: "" })
                                    }
                                    let uniqueObjArray = [...new Map(allPeers2.map((item) => [item["address"], item])).values()];
                                    setAllPeers(uniqueObjArray)
                                })
                        }
                    })
                })
        } else if (lucid) {
            setDb(GUN(["https://gun-server-1.glitch.me/gun", "http://5.189.177.177:8765/gun"]))
        }
    }, [db, walletStore.address, lucid])

    useEffect(() => {
        if (walletStore.name !== "") {
            initLucid(walletStore.name)
            setAllPeers([])
        }

    }, [walletStore.address])

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

    return (
        <>
            <div className="mockup-window p-10 border center" style={{ height: '80vh' }} >
                <div className="center font-bold">You : {walletStore.address}</div>
                <div className="text-center font-bold">
                    <h2 className="bold m-10" >Your chats:</h2>
                </div>
                <ul className="list-disc">
                    {allPeers.map((peer, index) => <li key={index}><a href={`/?peer=${peer.address}`} className="link text-ellipsis">{peer.handles === "" ? peer.address : peer.handles}</a></li>)}

                </ul>
            </div>
            <div className="input-group w-full my-5">
                <input onChange={(e) => { setPeerAddress(e.target.value) }} type="text" placeholder="Search wallet or handle..." className="input input-bordered w-full" value={peerAddress} />
                <Link href={`?peer=${peerAddress}`}>
                    <button className="btn btn-square">
                        Go
                    </button>
                </Link>
            </div>
        </>
    )

}

export default ChatList;