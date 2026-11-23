import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  Check,
  FlaskConical,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Users,
  BellRing,
} from 'lucide-react';
import Building, { CAR_COLORS } from './components/Building';
import { ALGORITHMS } from './sim/algorithms';
import { demoExperiment, randomizeExperiment, type AnimationExperiment } from './sim/presets';
import { dimensionConfig } from './research/runner';
import type { AlgorithmId, Snapshot } from './sim/types';
import {
  SCENARIO_NAMES,
  SIMPLE_ALGORITHM_NAMES,
  AlgorithmExplanation,
} from './components/SimpleExplanation';
const AdvancedWorkspace = lazy(() => import('./components/AdvancedWorkspace'));
const SimpleComparison = lazy(() => import('./components/SimpleComparison'));
const clock = (t: number) =>
  `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
export default function App() {
  const [experiment, setExperiment] = useState<AnimationExperiment>(demoExperiment),
    [snapshot, setSnapshot] = useState<Snapshot>(),
    [running, setRunning] = useState(false),
    [ready, setReady] = useState(false),
    [speed, setSpeed] = useState(5),
    [continuous, setContinuous] = useState(false),
    [advanced, setAdvanced] = useState(false),
    [error, setError] = useState(''),
    [car, setCar] = useState(0),
    [view, setView] = useState('all'),
    [callMessage, setCallMessage] = useState('각 층의 호출 버튼을 누르면 승객이 기다립니다.');
  const worker = useRef<Worker | null>(null),
    busy = useRef(false),
    time = useRef(0),
    repeat = useRef(false),
    randomSeed = useRef(2027),
    resetSerial = useRef(0);
  const [reset, setReset] = useState(0);
  const { config, algorithm, label } = experiment,
    metrics = snapshot?.metrics;
  const [floorDraft, setFloorDraft] = useState(() => String(config.floors)),
    [carDraft, setCarDraft] = useState(() => String(config.cars));
  useEffect(() => {
    setFloorDraft(String(config.floors));
    setCarDraft(String(config.cars));
  }, [experiment, reset]);
  function commitDimension(field: 'floors' | 'cars', draft: string) {
    const value = Number(draft),
      valid =
        draft.trim() !== '' &&
        Number.isInteger(value) &&
        value >= (field === 'floors' ? 5 : 1) &&
        value <= (field === 'floors' ? 100 : 20);
    if (field === 'floors') {
      setFloorDraft(String(valid ? value : config.floors));
      if (valid && value !== config.floors) resize(value, config.cars);
    } else {
      setCarDraft(String(valid ? value : config.cars));
      if (valid && value !== config.cars) resize(config.floors, value);
    }
  }
  repeat.current = continuous;
  function anotherRandom() {
    const seed = randomSeed.current++;
    setExperiment(randomizeExperiment(seed));
    setView('all');
    setCar(0);
    setCallMessage('새로운 조합을 골랐어요. 원하는 층에서 호출해 보세요.');
  }
  useEffect(() => {
    if (advanced) return;
    let active = true,
      first = true;
    setReady(false);
    setRunning(false);
    setError('');
    setSnapshot(undefined);
    time.current = 0;
    busy.current = false;
    const w = new Worker(new URL('./workers/live.worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    w.onmessage = ({ data }) => {
      if (!active) return;
      busy.current = false;
      if (data.type === 'error') {
        setError(data.message);
        setRunning(false);
        return;
      }
      const next: Snapshot | undefined = data.snapshots?.[0];
      if (!next) return;
      setSnapshot(next);
      time.current = next.time;
      setReady(true);
      if (first) {
        first = false;
        setRunning(true);
      }
      if (next.done) {
        setRunning(false);
        if (repeat.current) {
          const seed = randomSeed.current++;
          setExperiment(randomizeExperiment(seed));
          setView('all');
          setCar(0);
        }
      }
    };
    w.onerror = (e) => {
      if (active) {
        setError(e.message);
        setRunning(false);
        busy.current = false;
      }
    };
    w.postMessage({ type: 'init', config, algorithms: [algorithm] });
    return () => {
      active = false;
      w.terminate();
      worker.current = null;
    };
  }, [experiment, reset, advanced]);
  useEffect(() => {
    if (!running || !ready || advanced) return;
    const id = setInterval(() => {
      if (!busy.current) {
        busy.current = true;
        worker.current?.postMessage({ type: 'advance', time: time.current + 0.1 * speed });
      }
    }, 100);
    return () => clearInterval(id);
  }, [running, ready, speed, advanced]);
  function resize(floors: number, cars: number) {
    setExperiment((v) => ({
      ...v,
      config: dimensionConfig(v.config, floors, cars, v.config.congestion, v.config.seed),
      label: '직접 설정한 운행',
    }));
    setCar(0);
    setView('all');
  }
  function callFloors(floors: number[], count = 2) {
    if (!ready || snapshot?.done) return;
    busy.current = true;
    worker.current?.postMessage({ type: 'callFloors', floors, count });
    setRunning(true);
    setCallMessage(`${floors.map((f) => `${f}층`).join(', ')}에서 동시에 호출했어요.`);
  }
  function simultaneousCalls() {
    const fs = Array.from({ length: config.floors }, (_, i) => i + 1),
      start = Math.floor((snapshot?.time ?? 0) * 7) % fs.length;
    callFloors(
      Array.from(
        { length: Math.min(4, fs.length) },
        (_, i) => fs[(start + Math.floor((i * fs.length) / Math.min(4, fs.length))) % fs.length],
      ),
    );
  }
  const firstFloor = 1 - config.basements;
  const [low, high] = view === 'all' ? [firstFloor, config.floors] : view.split(':').map(Number);
  if (advanced)
    return (
      <div className="advanced-wrapper">
        <div className="advanced-return">
          <button onClick={() => setAdvanced(false)}>
            <ArrowRight size={15} style={{ transform: 'rotate(180deg)' }} />
            간단 화면으로
          </button>
          <span>기존의 상세 실험·비교 기능입니다.</span>
        </div>
        <Suspense fallback={<div className="simple-loading">연구 도구를 여는 중…</div>}>
          <AdvancedWorkspace />
        </Suspense>
      </div>
    );
  return (
    <main className="simple-app">
      <header className="simple-header">
        <div className="simple-brand">
          <span>
            <ArrowUpDown size={24} />
          </span>
          <div>
            <h1>엘리베이터 실험실</h1>
          </div>
        </div>
        <button
          className="simple-advanced"
          onClick={() => {
            setRunning(false);
            setAdvanced(true);
          }}
        >
          <FlaskConical size={16} />
          고급 연구
          <ArrowRight size={14} />
        </button>
      </header>
      <div className="simple-layout">
        <section className="simple-scene">
          <div className="simple-scene-header">
            <div>
              <h2>{label}</h2>
              <span className={'simple-live ' + (running ? 'active' : '')}>
                <i />
                {running
                  ? '지금 운행 중'
                  : snapshot?.done
                    ? (metrics?.unfinished ?? 0) > 0
                      ? '관찰 종료'
                      : '운행 완료'
                    : '일시 정지'}
              </span>
              <p className="simple-scene-note">
                {config.floors}층 · 엘리베이터 {config.cars}대 ·{' '}
                {
                  {
                    shared: '모든 층을 함께 운행',
                    parity: '홀수층과 짝수층을 나누어 운행',
                    zoned: '담당 구역을 나누어 운행',
                    dynamic: '붐비는 층에 따라 담당 변경',
                  }[
                    algorithm === 'static'
                      ? 'zoned'
                      : algorithm === 'dynamic'
                        ? 'dynamic'
                        : config.policy
                  ]
                }
              </p>
            </div>
            <div className="simple-clock">
              <span>시뮬레이션 시간</span>
              <b data-testid="simulation-time">{clock(snapshot?.time ?? 0)}</b>
            </div>
          </div>
          <div
            className="simple-building"
            style={{ '--visible-floors': high - low + 1 } as React.CSSProperties}
          >
            <Building
              snapshot={snapshot}
              config={config}
              selectedCar={car}
              onSelectCar={setCar}
              onSelectFloor={() => {}}
              onCallFloor={(f: number) => callFloors([f], 1)}
              low={low}
              high={high}
              playbackSpeed={speed}
              running={running}
              friendly
            />
            {(config.floors > 15 || config.cars > 3) && (
              <p className="building-scroll-hint">
                건물 안에서 위아래·좌우로 스크롤해 다른 층과 차량을 볼 수 있어요.
              </p>
            )}
            {config.floors > 20 && (
              <select
                className="simple-floor-view"
                aria-label="표시 층"
                value={view}
                onChange={(e) => {
                  const next = e.target.value;
                  setView(next);
                }}
              >
                <option value="all">모든 층 보기</option>
                {Array.from({ length: Math.ceil(config.floors / 20) }, (_, i) => (
                  <option key={i} value={`${i * 20 + 1}:${Math.min(config.floors, (i + 1) * 20)}`}>
                    {i * 20 + 1}~{Math.min(config.floors, (i + 1) * 20)}층 보기
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="simple-car-legend">
            {Array.from({ length: config.cars }, (_, i) => (
              <button
                key={i}
                data-testid={`simple-car-load-${i}`}
                className={car === i ? 'selected' : ''}
                onClick={() => setCar(i)}
              >
                <i
                  style={{
                    background:
                      (snapshot?.cars[i]?.passengers.length ?? 0) > 0
                        ? '#ffad55'
                        : CAR_COLORS[i % CAR_COLORS.length],
                  }}
                />
                {i + 1}호기
                <span>
                  탑승 {snapshot?.cars[i]?.passengers.length ?? 0}명 / 정원{' '}
                  {snapshot?.cars[i]?.spec.capacity ?? config.car.capacity}명
                </span>
              </button>
            ))}
          </div>
          <div className="simple-playback">
            <button
              className="simple-primary"
              disabled={!ready || !!error}
              onClick={() => {
                if (snapshot?.done) setReset(++resetSerial.current);
                else setRunning((v) => !v);
              }}
            >
              {running ? (
                <Pause size={19} fill="currentColor" />
              ) : (
                <Play size={19} fill="currentColor" />
              )}
              {running ? '멈춤' : snapshot?.done ? '다시 시작' : '시작'}
            </button>
            <button
              className="simple-reset"
              aria-label="처음부터"
              title="처음부터"
              onClick={() => setReset(++resetSerial.current)}
            >
              <RotateCcw size={19} />
            </button>
            <div className="simple-speed">
              <label htmlFor="simple-speed">재생 속도</label>
              <select
                id="simple-speed"
                aria-label="재생 속도"
                value={speed}
                onChange={(e) => setSpeed(+e.target.value)}
              >
                {[0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 500, 1000].map((n) => (
                  <option key={n} value={n}>
                    {n}배
                  </option>
                ))}
              </select>
            </div>
            <span className="simple-physics">
              <Check size={13} />
              실제 운행 계산
            </span>
          </div>
          <div className="simple-calls">
            <button disabled={!ready || snapshot?.done} onClick={simultaneousCalls}>
              <BellRing size={16} />
              여러 층 동시 호출
            </button>
            <span role="status">{callMessage}</span>
          </div>
          {error && (
            <div role="alert" className="simple-error">
              {error}
              <button onClick={() => setReset(++resetSerial.current)}>다시 시도</button>
            </div>
          )}
          <div className="simple-stats">
            <div>
              <span>
                <Users size={15} />
                기다리는 사람
              </span>
              <b>
                {metrics?.waiting ?? 0}
                <small>명</small>
              </b>
            </div>
            <div>
              <span>평균 기다린 시간</span>
              <b>
                {(metrics?.meanWait ?? 0).toFixed(1)}
                <small>초</small>
              </b>
            </div>
            <div>
              <span>목적지에 도착한 사람</span>
              <b>
                {metrics?.completed ?? 0}
                <small>명</small>
              </b>
            </div>
          </div>
        </section>
        <aside className="simple-sidebar">
          <section className="simple-settings">
            <h2 className="simple-section-title">건물 설정</h2>
            <div className="simple-number-pair">
              <label>
                건물 층수
                <div>
                  <input
                    aria-label="층수"
                    type="number"
                    min={5}
                    max={100}
                    value={floorDraft}
                    title="5~100층 · Enter 또는 다른 곳을 눌러 적용"
                    onChange={(e) => setFloorDraft(e.target.value)}
                    onBlur={() => commitDimension('floors', floorDraft)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                  />
                  <span>층</span>
                </div>
              </label>
              <label>
                엘리베이터
                <div>
                  <input
                    aria-label="차량 수"
                    type="number"
                    min={1}
                    max={20}
                    value={carDraft}
                    title="1~20대 · Enter 또는 다른 곳을 눌러 적용"
                    onChange={(e) => setCarDraft(e.target.value)}
                    onBlur={() => commitDimension('cars', carDraft)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                  />
                  <span>대</span>
                </div>
              </label>
            </div>
            <label className="simple-select-label">
              운행 알고리즘
              <select
                aria-label="알고리즘"
                value={algorithm}
                onChange={(e) =>
                  setExperiment((v) => ({
                    ...v,
                    algorithm: e.target.value as AlgorithmId,
                    label: '직접 설정한 운행',
                  }))
                }
              >
                {ALGORITHMS.map((a) => (
                  <option value={a.id} key={a.id}>
                    {SIMPLE_ALGORITHM_NAMES[a.id]}
                  </option>
                ))}
              </select>
            </label>
            <span className="simple-control-label">사람은 얼마나 많을까요?</span>
            <div className="simple-traffic">
              {[
                { n: 50, label: '한산해요' },
                { n: 100, label: '보통이에요' },
                { n: 300, label: '붐벼요' },
              ].map((o) => (
                <button
                  key={o.n}
                  className={config.congestion === o.n ? 'selected' : ''}
                  onClick={() =>
                    setExperiment((v) => ({ ...v, config: { ...v.config, congestion: o.n } }))
                  }
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>
          <section className="simple-random">
            <h2>무작위 운행 조건</h2>
            <p>건물, 승객 이동 패턴, 배차 알고리즘을 새로 뽑습니다.</p>
            <button className="simple-random-button" onClick={anotherRandom}>
              <Shuffle size={18} />
              랜덤 운행
            </button>
            <label className="simple-repeat">
              <input
                type="checkbox"
                aria-label="연속 랜덤"
                checked={continuous}
                onChange={(e) => {
                  setContinuous(e.target.checked);
                  if (e.target.checked && snapshot?.done) anotherRandom();
                }}
              />
              <span>연속 랜덤</span>
              <small>끝나면 새 조합으로</small>
            </label>
          </section>
          <AlgorithmExplanation algorithm={algorithm} />
        </aside>
      </div>
      <Suspense fallback={<div className="simple-loading">알고리즘 비교 준비 중…</div>}>
        <SimpleComparison config={experiment.config} />
      </Suspense>
      <footer className="simple-footer">
        <span>실제 승객 수요와 가감속·정원·문 개폐를 계산합니다.</span>
        <span>
          전체 승객 <b data-testid="generated-count">{metrics?.generated ?? 0}</b>명 ·{' '}
          {SCENARIO_NAMES[config.scenario]} · 재현 번호{' '}
          <b data-testid="random-seed">{config.seed}</b>
        </span>
      </footer>
    </main>
  );
}
