import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
export default function Header() {
    return (
        <React.Fragment>
            <AppBar position="static" color="default" onClick={() => {
                window.location.href = "/";
            }}>
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        sx={{ mr: 2 }}
                    >
                    </IconButton>
                    <div className='japanese_B' >
                        MISTAKE DETECTOR
                    </div>
                </Toolbar>
            </AppBar>
            <div style={{
                marginBottom: "4.5vh",
            }}></div>
        </React.Fragment>
    );
}