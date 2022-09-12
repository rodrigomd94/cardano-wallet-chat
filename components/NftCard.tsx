
import { useState } from 'react'
import { useStoreActions, useStoreState } from "../utils/store";


const NftCard = (props) => {
    const image = typeof (props.meta.image) === 'string' ? "https://ipfs.io/ipfs/" + props.meta.image.replace("ipfs://", "") : ""


    const selectedPeerAssets = useStoreState(state => state.selectedPeerAssets)
    const setSelectedPeerAssets = useStoreActions(actions => actions.setSelectedPeerAssets)
    const selectedSelfAssets = useStoreState(state => state.selectedSelfAssets)
    const setSelectedSelfAssets = useStoreActions(actions => actions.setSelectedSelfAssets)

    const [selected, setSelected] = useState(((selectedSelfAssets.filter((asset) => asset.assetId === props.meta.assetId).length > 0) || (selectedPeerAssets.filter((asset) => asset.assetId === props.meta.assetId).length > 0) )? true : false)
    const selectAsset = () => {
        if (selected) {
            if (props.type === "own") {
                setSelectedSelfAssets(selectedSelfAssets.filter((asset) => asset.meta.assetId != props.meta.assetId))
            } else {
                setSelectedPeerAssets(selectedPeerAssets.filter((asset) => asset.meta.assetId != props.meta.assetId))
            }
        } else {
            if (props.type === "own") {
                setSelectedSelfAssets([...selectedSelfAssets, props.meta])
            }else{
                setSelectedPeerAssets([...selectedPeerAssets, props.meta])
            }
        }

        setSelected(!selected)
    }
    return (
        <>
            <div className="card w-76 bg-base-300 shadow-xl m-5">
                <figure className="px-10 pt-10">
                    <img src={image} alt="Shoes" className="rounded-xl" />
                </figure>
                <div className="card-body items-center text-center">
                    <h2 className="card-title">{props.meta.name}</h2>
                    <div className="card-actions">
                        <button onClick={() => { selectAsset() }} className={`btn ${selected ? "btn-secondary" : "btn-primary"}`}>Select</button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default NftCard;