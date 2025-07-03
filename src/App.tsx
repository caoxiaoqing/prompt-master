import React from 'react';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import PromptEditor from './components/PromptEditor';
import AuthPage from './components/auth/AuthPage';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  console.log('🎯 AppContent 渲染状态:', { hasUser: !!user, loading });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">正在加载用户信息...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            如果长时间停留在此页面，请刷新浏览器
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🔓 显示登录页面');
    return <AuthPage />;
  }

  console.log('✅ 显示主应用界面');
  return (
    <AppProvider>
      <Layout>
        <PromptEditor />
      </Layout>
    </AppProvider>
  );
};

function App() {
  console.log('🚀 App 组件渲染');
  
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;