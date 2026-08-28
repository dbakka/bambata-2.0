$token = & "C:\Program Files\GitHub CLI\gh.exe" auth token
$git = "C:\Users\HP\AppData\Local\Programs\MinGit\cmd\git.exe"

& $git add -A
& $git commit -m "feat: NLE multi-track editor timeline with track headers, live Mute/Solo, Spacebar transport & on-waveform trimming"
& $git remote set-url origin "https://dbakka:$token@github.com/dbakka/bambata-2.0.git"
& $git push origin main
& $git remote set-url origin "https://github.com/dbakka/bambata-2.0.git"
