import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { styled } from '@mui/material';
const Offset = styled('div')(({ theme }) => theme.mixins.toolbar);
export default function Header() {
    return (
        <React.Fragment>
            <AppBar position="static" color="default">
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