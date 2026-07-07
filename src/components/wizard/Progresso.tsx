export default function Progresso({ passo, total }: { passo: number; total: number }) {
  return (
    <div className="progresso">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const classe = n < passo ? "prog-barra feita" : n === passo ? "prog-barra atual" : "prog-barra";
        return <div key={n} className={classe} />;
      })}
      <span className="prog-label">
        {passo} / {total}
      </span>
    </div>
  );
}
