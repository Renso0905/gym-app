interface Props {
  routineName: string;
  /** What differed from the routine, one short line each. */
  changes: string[];
  onUpdate: () => void;
  onKeep: () => void;
}

/** Shown after finishing a workout that did not match its routine. */
export function RoutineUpdatePrompt({ routineName, changes, onUpdate, onKeep }: Props) {
  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="routine-update-title">
        <h2 id="routine-update-title">Update “{routineName}”?</h2>
        <p className="muted">Your workout is saved. It was different from the routine:</p>
        <ul className="change-list">
          {changes.map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>
        <button type="button" className="primary wide" onClick={onUpdate}>
          Update routine to match
        </button>
        <button type="button" className="wide" onClick={onKeep}>
          Keep routine as it was
        </button>
      </div>
    </div>
  );
}
