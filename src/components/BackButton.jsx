import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function BackButton() {
    const navigate = useNavigate();
    const goBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }
        navigate('/');
    };

    return (
        <button className="page-back-button" type="button" onClick={goBack} aria-label="返回上一界面" title="返回上一界面">
            ←
        </button>
    );
}
