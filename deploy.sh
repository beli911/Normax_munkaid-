#!/bin/bash

# 🚀 Munkaidő Nyilvántartó Rendszer - Vercel Deployment Script
# Ez a script előkészíti a projektet a Vercel deployment-hez

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 MUNKAIDŐ NYILVÁNTARTÓ - VERCEL DEPLOYMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Git állapot ellenőrzése
echo "1️⃣  Git állapot ellenőrzése..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Vannak nem commitolt változások!"
    read -p "Szeretnéd commitolni őket? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add -A
        git commit -m "Deployment előkészítés"
        echo "✅ Változások commitolva"
    fi
else
    echo "✅ Git tiszta"
fi

# 2. Build tesztelés
echo ""
echo "2️⃣  Production build tesztelése..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build hiba! Javítsd ki a hibákat és próbáld újra."
    exit 1
fi
echo "✅ Build sikeres"

# 3. GitHub remote ellenőrzése
echo ""
echo "3️⃣  GitHub remote ellenőrzése..."
if git remote get-url origin > /dev/null 2>&1; then
    echo "✅ GitHub remote beállítva: $(git remote get-url origin)"
else
    echo "⚠️  Nincs GitHub remote beállítva!"
    echo ""
    echo "Futtasd ezt a parancsot:"
    echo "  git remote add origin https://github.com/FELHASZNALONEV/munkaido-nyilvantarto.git"
    echo "  git push -u origin main"
    echo ""
    read -p "Szeretnéd most beállítani? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "GitHub repository URL: " repo_url
        git remote add origin "$repo_url"
        echo "✅ Remote hozzáadva"
        read -p "Szeretnéd pusholni a kódot? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git push -u origin main
        fi
    fi
fi

# 4. Vercel deployment
echo ""
echo "4️⃣  Vercel deployment indítása..."
echo ""
echo "📋 Következő lépések:"
echo "   1. A Vercel CLI megnyitja a böngészőt a bejelentkezéshez"
echo "   2. Jóváhagyd a projekt beállításokat"
echo "   3. Add hozzá a környezeti változókat:"
echo "      - NEXT_PUBLIC_SUPABASE_URL"
echo "      - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo ""
read -p "Folytatod a deployment-et? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx vercel --prod
else
    echo ""
    echo "📝 Manuális deployment:"
    echo "   1. Menj a https://vercel.com oldalra"
    echo "   2. Import a GitHub repository-t"
    echo "   3. Add hozzá a környezeti változókat"
    echo "   4. Deploy!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment előkészítés kész!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
