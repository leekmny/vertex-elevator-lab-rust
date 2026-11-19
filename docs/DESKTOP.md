# Windows 실행 파일

배포 폴더는 `release/VERTEX-Windows`, 압축 파일은 `release/VERTEX-Windows.zip`입니다. 압축을 전부 푼 뒤 `VERTEX.exe`를 더블클릭합니다. 받는 PC에는 Node.js·npm·개발 서버·브라우저 설치가 필요하지 않습니다. `resources`, `locales`, DLL은 실행에 필요한 파일이므로 EXE만 떼어서 복사하지 않습니다.

프로그램을 닫을 때는 창의 X 버튼을 누릅니다. 설치 프로그램이 아닌 Windows x64 포터블 폴더입니다. 코드 서명은 포함되지 않아 Windows가 게시자를 확인하지 못할 수 있습니다.

## 서버 없는 실행 방식

Electron이 함께 배포된 Chromium 창을 열고 `vertex://app/index.html`에서 묶인 Vite 자산을 읽습니다. HTTP 서버를 띄우거나 localhost 포트에 연결하지 않습니다. 커스텀 프로토콜은 표준·보안 스킴으로 등록해 ES Module Web Worker가 같은 로컬 자산에서 동작하도록 합니다. 계산 엔진은 Rust로 구현되며 창과 별도의 Web Worker에서 WebAssembly로 실행합니다.

렌더러는 Node.js 접근을 비활성화하고 context isolation과 sandbox를 사용합니다. 프로토콜은 배포 자산 디렉터리 안의 파일만 읽으며 외부 HTTP 요청·새 창·권한 요청은 허용하지 않습니다. 배포 파일은 Electron ASAR에 묶입니다. 내부 프로토콜을 OS에 별도로 설치할 필요는 없습니다.

## 개발자가 다시 빌드하기

[Rust 포팅판 빌드 요구사항](RUST_PORT.md#실행과-검사)을 먼저 확인하세요.

```powershell
npm ci
npm run package:win
```

Electron 45.3.4, `@electron/packager` 20.3.0을 설치 시 npm 레지스트리에서 확인하고 사용했습니다. 개발용 Node.js는 22.12 이상이 필요합니다. 첫 빌드에는 Electron 런타임 다운로드를 위한 인터넷이 필요하며 완성된 실행 폴더는 오프라인으로 실행할 수 있습니다. npm이 설치 스크립트를 보류했다면 개발자만 `node node_modules/electron/install.js`를 한 번 실행합니다.

`package:win`은 웹 소스를 먼저 빌드하고 최소 배포 스테이징에 `dist`, `desktop`, 런처 설정만 복사합니다. 소스·개발 의존성과 `node_modules`는 받는 사용자에게 필요하지 않습니다. 폴더·ZIP 경로와 런타임 버전은 `release/desktop-manifest.json`에 기록됩니다.

## 검증

```powershell
npm test
npm run test:desktop
```

경로 테스트는 자산 조회·인코딩·경로 이탈·외부 탐색을 검사합니다. 실제 EXE 스모크 테스트는 번들 프로토콜의 Canvas 로드, 실제 Worker 시간 진행, 오프라인 새로고침 후 승객 생성, 렌더러 Node 비노출과 브라우저 오류 부재를 검사합니다. 별도 일반 실행 프로세스에 수신 TCP 포트가 없는지도 검사합니다. 자동화 도구 자체의 검사 포트와 구분하기 위해 이 마지막 검사는 디버깅 도구 없이 EXE를 실행합니다.

최종 실제 실행 결과는 `release/desktop-smoke.json`, 화면은 `docs/screenshots/desktop-simple.png`에 기록합니다.

구현 기준: [Electron protocol API](https://www.electronjs.org/docs/latest/api/protocol), [Electron security 문서](https://www.electronjs.org/docs/latest/tutorial/security/), [Electron Packager 옵션](https://electron.github.io/packager/main/interfaces/Options.html).
