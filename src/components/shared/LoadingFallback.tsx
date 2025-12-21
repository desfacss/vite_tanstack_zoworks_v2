import React from 'react';
import { Spin } from 'antd';
import { motion } from 'framer-motion';

export const LoadingFallback = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center"
    >
      <Spin size="large" />
    </motion.div>
  );
};