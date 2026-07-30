import CostsPanel from '../market/CostsPanel';
import AuctionPanel from '../market/AuctionPanel';
import SellPanel from '../market/SellPanel';

export default function MarketTab({ sub, zip, onZipChange }) {
  return (
    <>
      {sub === 'costs' && <CostsPanel />}
      {sub === 'auction' && <AuctionPanel zip={zip} onZipChange={onZipChange} />}
      {sub === 'sell' && <SellPanel />}
    </>
  );
}
