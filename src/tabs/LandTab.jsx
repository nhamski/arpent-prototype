import PasturesPanel from '../land/PasturesPanel';
import ForagePanel from '../land/ForagePanel';
import RotationPanel from '../land/RotationPanel';
import ConditionsPanel from '../land/ConditionsPanel';

export default function LandTab({ sub, zip }) {
  return (
    <>
      {sub === 'pastures' && <PasturesPanel />}
      {sub === 'scan' && <ForagePanel zip={zip} />}
      {sub === 'rotation' && <RotationPanel />}
      {sub === 'conditions' && <ConditionsPanel zip={zip} />}
    </>
  );
}
