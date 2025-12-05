#!/bin/bash

# Script para build de producción
echo "🚀 Iniciando build de producción..."

# Crear archivo .env.production si no existe
if [ ! -f .env.production ]; then
    echo "📝 Creando .env.production..."
    cat > .env.production << EOF
# URL de la API en producción
REACT_APP_API_URL=https://tu-backend-dominio.com/api
EOF
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Build de producción
echo "🔨 Creando build de producción..."
npm run build

echo "✅ Build completado! Los archivos están en la carpeta 'build'"
echo "📁 Puedes subir la carpeta 'build' a tu hosting" 