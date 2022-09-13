
import { useEffect } from 'react'
import NftCard from './NftCard'

const NftGrid = (props) => {

    return (
        <>
        <div className="grid grid-cols-2 gap-2">
                {props.nfts.map((nft, index) => {
                    return <NftCard type={props.type} key={nft.assetId} meta={nft} />
                })}
            </div>
        </>

    )
}

export default NftGrid;