import { useAchilles } from '../context/AchillesContext';

export function useUndoToast() {
  const { stageDelete } = useAchilles();
  return stageDelete;
}
