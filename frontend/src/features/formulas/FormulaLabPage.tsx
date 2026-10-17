import { Link, useSearchParams } from 'react-router';

import { ResearchShell } from '../research/ResearchShell';
import { fold } from '../../shell/fold';
import { Stagger, StaggerItem } from '../../motion/choreography';
import { Segmented } from '../../ui/Segmented';
import { AREAS, FORMULAS, type FormulaArea } from './formula-registry';

type AreaFilter = FormulaArea | 'all';

/**
 * Every derived number on the platform: formula, definition, missing-data rule, a hand-checked
 * example and where it is used. Filter by area or search; the state lives in the URL.
 */
export function FormulaLabPage() {
  const [params, setParams] = useSearchParams();
  const rawArea = params.get('area');
  const area: AreaFilter = AREAS.includes(rawArea as FormulaArea)
    ? (rawArea as FormulaArea)
    : 'all';
  const term = params.get('q') ?? '';
  const needle = fold(term.trim());
  const shown = FORMULAS.filter((f) => area === 'all' || f.area === area).filter(
    (f) =>
      !needle ||
      [f.name, f.formula, f.definition, f.missing].some((field) =>
        fold(field).includes(needle),
      ),
  );
  const update = (key: 'area' | 'q', value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: key === 'q' });
  };
  return (
    <ResearchShell
      title="Formula lab"
      lede={
        <p>
          Every number the platform derives, written out: the formula, what it means,
          what happens when inputs are missing, a worked example and where you will meet
          it. The calculations run in the backend; this page explains them.
        </p>
      }
    >
      <div className="pmod__controls formula-controls">
        <Segmented
          label="Formula area"
          options={[
            { value: 'all', label: `All ${FORMULAS.length}` },
            ...AREAS.map((a) => ({
              value: a,
              label: `${a} ${FORMULAS.filter((f) => f.area === a).length}`,
            })),
          ]}
          value={area}
          onChange={(value) => update('area', value === 'all' ? '' : value)}
        />
        <label className="formula-search">
          Search formulas
          <input
            type="search"
            value={term}
            maxLength={60}
            placeholder="percentile, rest, eFG…"
            onChange={(e) => update('q', e.target.value)}
          />
        </label>
      </div>
      <p className="formula-count">
        {shown.length} of {FORMULAS.length} formulas
      </p>
      {shown.length ? (
        <Stagger as="ul" className="formulas" gap={0.03} key={`${area}:${needle}`}>
          {shown.map((f) => (
            <StaggerItem as="li" key={f.id}>
              <article className="formula" id={f.id} aria-labelledby={`${f.id}-name`}>
                <header className="formula__head">
                  <span className="formula__area">{f.area}</span>
                  {f.added ? <span className="formula__new">New in 3.0</span> : null}
                </header>
                <h2 className="formula__name" id={`${f.id}-name`}>
                  {f.name}
                </h2>
                <code className="formula__math">{f.formula}</code>
                <p>{f.definition}</p>
                <dl className="formula__facts">
                  <div>
                    <dt>Missing or thin data</dt>
                    <dd>{f.missing}</dd>
                  </div>
                  <div>
                    <dt>Worked example</dt>
                    <dd>{f.example}</dd>
                  </div>
                  <div>
                    <dt>Implemented in</dt>
                    <dd>
                      <code>{f.implementedIn}</code>
                    </dd>
                  </div>
                </dl>
                <p className="formula__used">
                  {f.usedIn.map((u) => (
                    <Link key={u.to} to={u.to}>
                      {u.label}
                    </Link>
                  ))}
                </p>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <p className="pmod__empty">
          No formula matches. <Link to="/lab/formulas">Show every formula</Link>.
        </p>
      )}
    </ResearchShell>
  );
}
