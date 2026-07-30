import AnimalsPanel from '../herd/AnimalsPanel';
import HealthPanel from '../herd/HealthPanel';
import BreedingPanel from '../herd/BreedingPanel';

export default function HerdTab({ sub }) {
  return (
    <>
      {sub === 'animals' && <AnimalsPanel />}
      {sub === 'health' && <HealthPanel />}
      {sub === 'breeding' && <BreedingPanel />}
    </>
  );
}
