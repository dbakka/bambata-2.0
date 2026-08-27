$git = "C:\Users\HP\AppData\Local\Programs\MinGit\cmd\git.exe"
$gh = "C:\Program Files\GitHub CLI\gh.exe"

Write-Host "1. Initializing Git..."
& $git init
& $git config user.name "dbakka"
& $git config user.email "hello@dbakka.com"
& $git branch -M main

Write-Host "2. Staging files..."
& $git add .

Write-Host "3. Creating initial commit..."
& $git commit -m "feat: BAMBATA 2.0 - Generative AI DJ Mashup & Deep Reconstruction Engine"

Write-Host "4. Creating GitHub repository dbakka/bambata-2.0 and pushing..."
& $gh repo create dbakka/bambata-2.0 --public --source=. --remote=origin --push --description "BAMBATA 2.0 - Feedback-Driven Generative AI DJ Mashup & Deep Reconstruction Engine"

Write-Host "Done!"
