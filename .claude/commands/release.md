# リリース作成

バージョンを上げて正式リリースを作成する。

## 手順

1. 引数からバージョンタイプを判定（デフォルト: minor）
   - `$ARGUMENTS` が "patch" → パッチ
   - `$ARGUMENTS` が "major" → メジャー
   - それ以外 → マイナー
2. `npm run validate` と `npm run check-uuids` で検証
3. `node scripts/bump-version.js <type>` でバージョンアップ
4. `version.json` の changelog に今回の変更内容を追記
5. `docs/CHANGELOG.md` を更新
6. コミット: `chore: バージョン x.y.z`
7. `git tag vx.y.z`
8. push（タグ含む）→ GitHub Actions が Release 自動作成
9. リリース URL を報告
