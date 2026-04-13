export function renderSlotDisplay(slot: string): JSX.Element {
  const splitIndex = slot.indexOf("-");
  if (splitIndex < 0) {
    return <span className="block w-fit mx-auto text-left">{slot}</span>;
  }

  const start = slot.slice(0, splitIndex).trim();
  const end = slot.slice(splitIndex + 1).trim();
  if (!start || !end) {
    return <span className="block w-fit mx-auto text-left">{slot}</span>;
  }

  return (
    <div className="mx-auto flex w-fit flex-col items-start leading-tight text-left">
      <span>{`${start} -`}</span>
      <span>{end}</span>
    </div>
  );
}
