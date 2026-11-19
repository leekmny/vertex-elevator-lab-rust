# VERTEX Rust 포팅

Rust는 승객 수요, 차량과 문 이동, 14개 배차 알고리즘, 이벤트 순서, 승객 이동 및
운행 지표를 계산합니다. 고급 연구의 반복 실행, 취소 시 부분 결과, 통계와 짝지은
비교도 같은 Rust 코어를 사용합니다. React 화면과 Electron 실행 방식은 기존
사용 흐름을 유지합니다. 웹 워커는 그 코어를 WebAssembly로 실행합니다.

`rust-anything 1.5.1 analyze --lang ts --whole-app`으로 TypeScript 소스의 작업
경계를 확인했습니다. Rust 구현은 기존 런타임의 관찰 결과 및 테스트와 대조했습니다.

## 실행과 검사

```sh
npm ci
rustup target add wasm32-unknown-unknown
npm run dev
```

Rust 1.96 이상, Node.js 24를 사용합니다. 로컬 Cargo가 없으면 빌드 스크립트가
Docker의 Linux 엔진과 공식 Rust 이미지를 사용합니다.

```sh
cargo test --locked --manifest-path rust/Cargo.toml
npm test
npx playwright install chromium
npm run test:e2e
```

Windows에서 `npm run package:win`은 `release/VERTEX-Windows/`와 ZIP을 생성합니다.
`npm run test:desktop`으로 실제 EXE의 오프라인 실행, 호출과 운행, 알고리즘 비교를
확인할 수 있습니다.

## 동일 입력으로 RECHECK 실행

원본 TypeScript 기준은 `6b8d78b5b21da3b5249eb9700a7fd15590d26470`입니다. 이
저장소의 `src/sim`과 `src/research`에 있는 동일한 원본 함수에 고정 입력을 전달하고,
Rust 네이티브 CLI에도 같은 입력을 전달합니다. Linux x64에서 예제를 준비합니다.

```sh
node --import tsx scripts/parity/fixtures.ts ../vertex-parity
./node_modules/.bin/esbuild scripts/parity/reference.ts --bundle --platform=node --format=esm --outfile=../vertex-parity/reference.mjs
cargo build --locked --release --manifest-path rust/Cargo.toml --bin vertex
python scripts/parity/run-recheck.py --recheck ../Recheck \
  --reference ../vertex-parity/reference.mjs --reference-language typescript \
  --candidate rust/target/release/vertex --language rust \
  --cases ../vertex-parity/cases.json --image recheck-porting:linux-x64 \
  --output ../vertex-recheck-result --concurrency 4
```

`porting-run`이 포함된 RECHECK 체크아웃과 그 체크아웃에서 빌드한 Linux x64 워커
이미지가 필요합니다. RECHECK 실행 디렉터리에는 관찰 JSON과 HTML, 실행 명세,
런타임·이미지와 실행 파일의 해시가 남습니다.

[실측 요약](verification/rust-port-parity.json)은 **22/22 일치**를 기록합니다. 14개
알고리즘, 11개 수요 패턴, 수동 호출과 고장, 재생 탐색, 층별 제한, 연구 지표와
취소를 포함합니다. 연구 실행 시각과 소요 시간을 제외한 JSON 결과를 수치 허용
오차 없이 비교했습니다.
