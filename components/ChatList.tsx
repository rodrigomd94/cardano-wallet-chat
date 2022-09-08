import { Lucid, Blockfrost, utf8ToHex, C } from "lucid-cardano";
import { useState, useEffect, useRef } from 'react';
import { useStoreActions, useStoreState } from "../utils/store";
import { useRouter } from 'next/router'
import Link from "next/link";

import GUN from 'gun'

const ChatList = (props) => {
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
                .get(walletStore.address)
                .map()
                .once((data, index) => {
                    if (!allPeers2.includes(index) && index.startsWith("addr")) {
                        allPeers2.push(index)
                        setAllPeers([... new Set(allPeers2)])
                    }
                })
            db.get('chat3')
                .map()
                .once((data, index) => {
                    console.log(data, index)
                    Object.keys(data).map((key) => {
                        if (!allPeers2.includes(key) && key.startsWith("addr")) {
                            allPeers2.push(index)
                            setAllPeers([... new Set(allPeers2)])
                        }
                    })
                })
            console.log(walletStore.address)
            console.log("getting chat")
        } else if (lucid) {
            setDb(GUN(["https://gun-server-1.glitch.me/gun"]))
        }
    }, [db, walletStore.address, lucid])

    useEffect(() => {
        if (walletStore.name !== "") {
            initLucid(walletStore.name)
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
            <div className="mockup-window p-10 border border-base-300 center" style={{ height: '80vh' }} >
                <div className="center font-bold">You : {walletStore.address}</div>
                <div className="text-center font-bold">
                    <h2 className="bold m-10" >Your chats:</h2>
                </div>
                {allPeers.map((peer, index) => <div key={index}><a href={`/?peer=${peer}`} className="link text-ellipsis">{peer}</a></div>)}
            </div>
            <div className="input-group w-full my-5">
                <input onChange={(e) => { setPeerAddress(e.target.value) }} type="text" placeholder="Search wallet..." className="input input-bordered w-full" value={peerAddress} />
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