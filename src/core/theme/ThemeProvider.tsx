
import React from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import { getAntdTheme } from './ThemeRegistry';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const antdTheme = getAntdTheme();

    return (
        <ConfigProvider theme={antdTheme}>
            <AntApp>
                {children}
            </AntApp>
        </ConfigProvider>
    );
};
