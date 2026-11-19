# GitHub 배포 안내

이 문서는 Rust 포팅판의 Windows 실행 ZIP을 빌드하고 GitHub Release에 첨부하는 절차를 안내합니다. 공개 다운로드는 [원본 TypeScript판 v1.0.0 릴리스](https://github.com/leekmny/vertex-elevator-lab/releases/tag/v1.0.0)에서 제공됩니다.

## 게시 전 확인

- 저장소 이름과 공개 대상 파일을 확인합니다.
- 프로젝트는 소유자가 선택한 [MIT 라이선스](../LICENSE)로 공개합니다. 배포 폴더의 `LICENSE-VERTEX.txt`는 프로젝트 라이선스이며, Electron·Chromium·사용 라이브러리 고지도 함께 유지합니다.
- 프로그램은 호기심을 직접 실험하고 운행 방식을 비교하며 배우기 위한 시뮬레이터입니다. 모델의 가정과 한계를 README 및 엔진 문서와 함께 제공합니다.

## 소스에 포함할 파일

`rust`, `src`, `desktop`, `scripts`, `tests`, `docs`, `examples`, `README.md`, `CHANGELOG.md`, `LICENSE`, `package.json`, `package-lock.json`과 빌드·테스트 설정을 포함합니다. `index.html`도 빌드 진입점이므로 필요합니다.

`node_modules`, `dist`, `release`, 테스트 결과, `.audit-recipient`, `.desktop-build` 등의 생성·검수 파일은 Git 추적에서 제외합니다. `.gitignore`가 적용된 추적 파일 목록을 검토한 뒤 업로드합니다.

## 실행 파일 준비와 검증

Windows에서 [Rust 포팅판 빌드 요구사항](RUST_PORT.md#실행과-검사)을 충족한 뒤 실행합니다.

```powershell
npm ci
npx playwright install chromium
npm test
npm run test:e2e
npm run package:win
npm run test:desktop
```

`package:win`은 Rust WebAssembly 빌드, TypeScript 검사, 웹 빌드를 포함합니다. 결과 폴더는 `release/VERTEX-Windows`, 결과 ZIP은 `release/VERTEX-Windows.zip`입니다. 정상 실행을 확인한 뒤 ZIP의 SHA256을 생성해 같은 릴리스에 첨부합니다.

```powershell
$zipPath = '.\release\VERTEX-Windows.zip'
$zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
$checksumPath = Join-Path (Split-Path -Parent $zipPath) 'SHA256SUMS.txt'
[IO.File]::WriteAllText($checksumPath, "$zipHash  VERTEX-Windows.zip`n", [Text.Encoding]::ASCII)
```

ZIP을 다시 만들었다면 체크섬도 다시 생성해야 합니다.

## 릴리스 초안

1. 검토한 소스 커밋을 공개 저장소에 업로드합니다.
2. GitHub 저장소의 **Releases → Draft a new release**에서 해당 커밋에 버전 태그를 지정합니다.
3. 제목에 VERTEX Rust 포트, 버전, Windows x64를 명시합니다.
4. [Rust 포팅 문서](RUST_PORT.md)를 참고해 실행 방법·한계·검증 내용을 릴리스 설명에 적습니다.
5. 아래 두 파일을 첨부하고 우선 초안으로 저장해 검토합니다.

| 첨부 파일 | 용도 |
|---|---|
| `VERTEX-Windows.zip` | 일반 사용자가 내려받을 실행 프로그램 전체 폴더 |
| `SHA256SUMS.txt` | ZIP의 SHA256 확인값 |

게시할 때는 라이선스·첨부 파일·태그의 대상 커밋을 함께 확인합니다. 게시 후에는 실제 다운로드 링크로 ZIP을 받아 압축을 풀고 실행해 봅니다.

## 받는 사람의 실행과 체크섬 확인

[README의 Windows 다운로드 안내](../README.md#windows-다운로드)에서 Releases를 열고 **Assets의 `VERTEX-Windows.zip`**을 받습니다. GitHub가 자동으로 제공하는 **`Source code (zip)`은 소스 묶음**이며 실행 파일 ZIP과 다릅니다.

ZIP과 `SHA256SUMS.txt`를 같은 다운로드 폴더에 저장하고 PowerShell에서 확인할 수 있습니다.

```powershell
$expected = ((Get-Content -LiteralPath '.\SHA256SUMS.txt' | Where-Object { $_ -match '  VERTEX-Windows\.zip$' }) -split '\s+')[0]
$actual = (Get-FileHash -LiteralPath '.\VERTEX-Windows.zip' -Algorithm SHA256).Hash
if (-not $expected -or $actual -ne $expected) { throw 'ZIP 체크섬이 일치하지 않습니다.' }
'ZIP 체크섬 일치'
```

그다음 ZIP **전체**를 압축 해제하고 `VERTEX-Windows/VERTEX.exe`를 실행합니다. EXE 옆 `resources`, `locales`, DLL을 함께 유지합니다. 인터넷·Node.js·npm·개발 서버는 필요하지 않습니다. 프로그램 종료는 창의 X 버튼입니다.

이 버전은 코드 서명되지 않았으므로 Windows에서 게시자를 확인할 수 없다는 안내가 표시될 수 있습니다. 자세한 실행 방식은 [데스크톱 문서](DESKTOP.md), 모델의 한계는 [검증 상태](STATUS.md)를 참고하세요.
