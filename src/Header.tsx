import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
export default function Header() {
    return (
        <React.Fragment>
            <AppBar position="static" color="default" onClick={() => {
                window.location.href = "/";
            }}>
                <Toolbar>
                    <img src="headerIcon.svg" alt="headerIcon" />
                    <div className='japanese_B' style={{ marginLeft: "0.4vw" }}>
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