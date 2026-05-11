#!/bin/bash

# 🔍 Pre-Deployment Checklist Script
# Futtasd le publikálás ELŐTT!

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 PRE-DEPLOYMENT ELLENŐRZÉS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. .env.local ellenőrzés
echo "1️⃣  .env.local fájl ellenőrzése..."
if [ -f .env.local ]; then
    echo "   ✅ .env.local létezik"
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local && grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local && grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local; then
        echo "   ✅ Minden szükséges környezeti változó be van állítva"
    else
        echo "   ⚠️  Hiányzó környezeti változók!"
    fi
else
    echo "   ⚠️  .env.local fájl nem található!"
fi
echo ""

# 2. Build tesztelés
echo "2️⃣  Build tesztelés..."
if npm run build > /dev/null 2>&1; then
    echo "   ✅ Build sikeres"
else
    echo "   ❌ Build HIBA! Ne deployolj!"
    echo "   Futtasd: npm run build (részletekhez)"
    exit 1
fi
echo ""

# 3. Linter ellenőrzés
echo "3️⃣  Linter ellenőrzés..."
if npm run lint > /dev/null 2>&1; then
    echo "   ✅ Linter OK"
else
    echo "   ⚠️  Linter figyelmeztetések (nem kritikus)"
fi
echo ""

# 4. Git állapot
echo "4️⃣  Git állapot..."
if [ -n "$(git status --porcelain)" ]; then
    echo "   ⚠️  Vannak nem commitolt változások"
    echo "   Javasolt: git add . && git commit -m '...'"
else
    echo "   ✅ Nincs nem commitolt változás"
fi
echo ""

# 5. Node modules
echo "5️⃣  Dependencies ellenőrzése..."
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules létezik"
else
    echo "   ⚠️  node_modules hiányzik! Futtasd: npm install"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 ÖSSZEFOGLALÁS:"
echo ""
echo "✅ Ha minden rendben van, futtasd:"
echo "   npx vercel --prod"
echo ""
echo "⚠️  Ha vannak hibák, JAVÍTSD KI ELŐBB!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
