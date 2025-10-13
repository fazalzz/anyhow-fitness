import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  return {
    // Flatten plugins to avoid Plugin[][] typing issues
    plugins: [
      ...react({
        jsxRuntime: 'classic',
        jsxImportSource: 'react',
      })
    ],
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@components': path.resolve(__dirname, './components'),
        '@hooks': path.resolve(__dirname, './hooks'),
        '@context': path.resolve(__dirname, './context'),
        '@types': path.resolve(__dirname, './src/types'),
      },
    },
    server: {
      port: 5173,
      strictPort: true, // Fail if port is already in use instead of trying another
      open: true,
      // Use undefined instead of empty object for proper typing
      proxy: undefined,
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          // Force new file names with timestamp to bust cache aggressively
          entryFileNames: `assets/[name]-CACHEBUST-${Date.now()}-[hash].js`,
          chunkFileNames: `assets/[name]-CACHEBUST-${Date.now()}-[hash].js`,
          assetFileNames: `assets/[name]-CACHEBUST-${Date.now()}-[hash].[ext]`,
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
          },
        },
      },
    },
  };
});


