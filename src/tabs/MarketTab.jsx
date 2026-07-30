import CostsPanel from '../market/CostsPanel';
import AuctionPanel from '../market/AuctionPanel';
import SellPanel from '../market/SellPanel';

export default function MarketTab({ sub }) {
  return (
    <>
      {sub === 'costs' && <CostsPanel />}
      {sub === 'auction' && <AuctionPanel />}
      {sub === 'sell' && <SellPanel />}
    </>
  );
}
