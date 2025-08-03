import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

interface AuthPageProps {
  isModal?: boolean
}

const AuthPage: React.FC<AuthPageProps> = ({ isModal }) => {
  const [isLogin, setIsLogin] = useState(true)

  const switchToRegister = () => setIsLogin(false)
  const switchToLogin = () => setIsLogin(true)

  return (
    <div className={isModal ? 'h-full' : 'min-h-screen'}>
      <AnimatePresence mode="wait">
        {isLogin ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <LoginForm onSwitchToRegister={switchToRegister} isModal={isModal} />
          </motion.div>
        ) : (
          <motion.div
            key="register"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <RegisterForm onSwitchToLogin={switchToLogin} isModal={isModal} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AuthPage