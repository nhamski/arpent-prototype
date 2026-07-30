import PasturesPanel from '../land/PasturesPanel';
import ForagePanel from '../land/ForagePanel';
import RotationPanel from '../land/RotationPanel';
import ConditionsPanel from '../land/ConditionsPanel';

export default function LandTab({ sub }) {
  return (
    <>
      {sub === 'pastures' && <PasturesPanel />}
      {sub === 'scan' && <ForagePanel />}
      {sub === 'rotation' && <RotationPanel />}
      {sub === 'conditions' && <ConditionsPanel />}
    </>
  );
}
