$token = & "C:\Program Files\GitHub CLI\gh.exe" auth token
$git = "C:\Users\HP\AppData\Local\Programs\MinGit\cmd\git.exe"

& $git add -A
& $git commit -m "feat: Manual vs Auto Mix Mode with Dual-Deck In/Out Timeline, BS-Roformer Extraction & Absolute Groove Key-Lock"
& $git remote set-url origin "https://dbakka:$token@github.com/dbakka/bambata-2.0.git"
& $git push origin main
& $git remote set-url origin "https://github.com/dbakka/bambata-2.0.git"
