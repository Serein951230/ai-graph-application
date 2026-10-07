import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCamera, FiChevronLeft, FiX } from 'react-icons/fi';
import { getCurrentUserBinding, getCurrentUserDisplayAccount, getUserScopedStorageKey } from '../data/learningResources';

const PROFILE_STORAGE_KEY = 'snowwave-profile';
const getDefaultProfile = () => ({
    nickname: getCurrentUserBinding().nickname || '',
    bio: '',
    avatarPreview: '',
    coverPreview: '',
});
const avatarInitial = value => (String(value || '').trim().slice(0, 1) || '?');
const cropSettings = {
    avatar: { label: '头像', outputWidth: 512, outputHeight: 512, stageWidth: 620, stageHeight: 620, frameWidth: 600, frameHeight: 600 },
    cover: { label: '名片', outputWidth: 1600, outputHeight: 520, stageWidth: 1000, stageHeight: 560, frameWidth: 760, frameHeight: 247 },
};
function loadStoredProfile() {
    try {
        const defaultProfile = getDefaultProfile();
        const stored = localStorage.getItem(getUserScopedStorageKey(PROFILE_STORAGE_KEY));
        if (!stored) return defaultProfile;
        const savedProfile = { ...defaultProfile, ...JSON.parse(stored) };
        return {
            ...savedProfile,
            bio: savedProfile.bio === '已有的事后必再有，已行的事后必再行' ? '' : savedProfile.bio,
            avatarPreview: savedProfile.avatarPreview || '',
            coverPreview: savedProfile.coverPreview || '',
        };
    } catch {
        return getDefaultProfile();
    }
}

function saveStoredProfile(profile) {
    try {
        localStorage.setItem(getUserScopedStorageKey(PROFILE_STORAGE_KEY), JSON.stringify(profile));
        window.dispatchEvent(new Event('snowwave-profile-updated'));
    } catch {
        // Ignore storage failures, usually caused by oversized local images.
    }
}

export default function Profile() {
    const [profile, setProfile] = useState(loadStoredProfile);
    const [nickname, setNickname] = useState(profile.nickname);
    const [draftNickname, setDraftNickname] = useState(profile.nickname);
    const [bio, setBio] = useState(profile.bio);
    const [draftBio, setDraftBio] = useState(profile.bio);
    const [avatarPreview, setAvatarPreview] = useState(profile.avatarPreview);
    const [coverPreview, setCoverPreview] = useState(profile.coverPreview);
    const [editing, setEditing] = useState(false);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [imageCrop, setImageCrop] = useState(null);
    const avatarInputRef = useRef(null);
    const coverInputRef = useRef(null);
    const cropDragRef = useRef(null);
    const email = getCurrentUserDisplayAccount();
    const updateProfile = (nextProfile) => {
        setProfile(nextProfile);
        saveStoredProfile(nextProfile);
    };
    const handleAvatarChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setImageCrop({ target: 'avatar', src: reader.result, x: 0, y: 0, scale: 1.2 });
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };
    const handleCoverChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setImageCrop({ target: 'cover', src: reader.result, x: 0, y: 0, scale: 1 });
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };
    const handleCropPointerDown = (event) => {
        if (!imageCrop) return;
        cropDragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            cropX: imageCrop.x,
            cropY: imageCrop.y,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const handleCropPointerMove = (event) => {
        const drag = cropDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        setImageCrop(current => current ? {
            ...current,
            x: drag.cropX + event.clientX - drag.startX,
            y: drag.cropY + event.clientY - drag.startY,
        } : current);
    };
    const stopCropDrag = () => {
        cropDragRef.current = null;
    };
    const handleCropWheel = (event) => {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -0.08 : 0.08;
        setImageCrop(current => current ? {
            ...current,
            scale: Math.min(3, Math.max(1, Number((current.scale + delta).toFixed(2)))),
        } : current);
    };
    const saveCroppedImage = () => {
        if (!imageCrop) return;
        const settings = cropSettings[imageCrop.target];
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = settings.outputWidth;
            canvas.height = settings.outputHeight;
            const context = canvas.getContext('2d');
            const imageRatio = image.width / image.height;
            const stageRatio = settings.stageWidth / settings.stageHeight;
            const baseWidth = imageRatio > stageRatio ? settings.stageHeight * imageRatio : settings.stageWidth;
            const baseHeight = imageRatio > stageRatio ? settings.stageHeight : settings.stageWidth / imageRatio;
            const scaledWidth = baseWidth * imageCrop.scale;
            const scaledHeight = baseHeight * imageCrop.scale;
            const left = (settings.stageWidth - scaledWidth) / 2 + imageCrop.x;
            const top = (settings.stageHeight - scaledHeight) / 2 + imageCrop.y;
            const frameLeft = (settings.stageWidth - settings.frameWidth) / 2;
            const frameTop = (settings.stageHeight - settings.frameHeight) / 2;
            const sourceWidth = (settings.frameWidth / scaledWidth) * image.width;
            const sourceHeight = (settings.frameHeight / scaledHeight) * image.height;
            const sourceX = Math.min(Math.max(((frameLeft - left) / scaledWidth) * image.width, 0), Math.max(0, image.width - sourceWidth));
            const sourceY = Math.min(Math.max(((frameTop - top) / scaledHeight) * image.height, 0), Math.max(0, image.height - sourceHeight));
            context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, settings.outputWidth, settings.outputHeight);
            const nextImage = canvas.toDataURL('image/jpeg', 0.92);
            const nextProfile = imageCrop.target === 'avatar'
                ? { ...profile, nickname, bio, avatarPreview: nextImage }
                : { ...profile, nickname, bio, coverPreview: nextImage };
            if (imageCrop.target === 'avatar') {
                setAvatarPreview(nextImage);
            } else {
                setCoverPreview(nextImage);
            }
            updateProfile(nextProfile);
            setImageCrop(null);
        };
        image.src = imageCrop.src;
    };
    const openEditor = () => {
        setDraftNickname(nickname);
        setDraftBio(bio);
        setEditing(true);
    };
    const saveProfile = () => {
        const nextNickname = draftNickname || nickname;
        const nextProfile = { ...profile, nickname: nextNickname, bio: draftBio, avatarPreview, coverPreview };
        setNickname(nextNickname);
        setBio(draftBio);
        updateProfile(nextProfile);
        setEditing(false);
    };
    const fallbackAvatar = <span className="profile-empty-avatar">{avatarInitial(nickname)}</span>;
    const draftFallbackAvatar = <span className="profile-empty-avatar">{avatarInitial(draftNickname || nickname)}</span>;
    const openAvatarPreview = () => {
        setMediaPreview({ type: 'avatar', title: '头像', src: avatarPreview, fallback: fallbackAvatar });
    };
    const openCoverPreview = () => {
        setMediaPreview({ type: 'cover', title: '名片', src: coverPreview });
    };

    return (
        <div className="profile-page">
            <section className="profile-hero-card glass-card">
                <div
                    className={`profile-cover ${coverPreview ? 'profile-cover-clickable' : ''}`}
                    style={coverPreview ? { backgroundImage: `url(${coverPreview})` } : undefined}
                    onClick={coverPreview ? openCoverPreview : undefined}
                    role={coverPreview ? 'button' : undefined}
                    tabIndex={coverPreview ? 0 : undefined}
                    onKeyDown={(event) => {
                        if (coverPreview && (event.key === 'Enter' || event.key === ' ')) openCoverPreview();
                    }}
                >
                    <button className="profile-edit-button" type="button" onClick={(event) => { event.stopPropagation(); openEditor(); }}>编辑个人资料</button>
                </div>
                <input ref={avatarInputRef} className="profile-file-input" type="file" accept="image/*" onChange={handleAvatarChange} />
                <input ref={coverInputRef} className="profile-file-input" type="file" accept="image/*" onChange={handleCoverChange} />
                <div className="profile-card-body">
                    <button className="profile-avatar profile-avatar-large" type="button" onClick={openAvatarPreview} aria-label="查看头像">
                        {avatarPreview ? <img src={avatarPreview} alt="头像预览" /> : fallbackAvatar}
                    </button>
                    <div className="profile-identity">
                        <h1>{nickname}</h1>
                        <p className="profile-contact">{email}</p>
                        {bio && <p className="profile-bio">{bio}</p>}
                    </div>
                </div>
            </section>

            <aside className="profile-bottom-grid" aria-label="个人中心快捷入口">
                <ProfileNavButton to="/study-stats" icon="📊" title="学习统计" desc="查看学习时间、练习题和课程进度。" />
                <ProfileNavButton to="/history" icon="◷" title="历史记录" desc="查看看过的视频，按时间从新到旧排序。" />
                <ProfileNavButton to="/friends" icon="☷" title="社交" desc="查看好友、群聊、回复和每日学习排行。" />
                <ProfileNavButton to="/achievements" icon="🏆" title="我的成就" desc="查看成就进度、勋章墙和解锁状态。" />
            </aside>

            {editing && (
                <div className="profile-editor-backdrop">
                    <section className="profile-editor">
                        <div className="profile-editor-cover" style={coverPreview ? { backgroundImage: `url(${coverPreview})` } : undefined}>
                            <button type="button" onClick={() => coverInputRef.current?.click()} aria-label="修改名片"><FiCamera aria-hidden="true" /></button>
                        </div>
                        <button className="profile-editor-avatar" type="button" onClick={() => avatarInputRef.current?.click()} aria-label="修改头像">
                            {avatarPreview ? <img src={avatarPreview} alt="头像预览" /> : draftFallbackAvatar}
                            <span><FiCamera aria-hidden="true" /></span>
                        </button>
                        <label className="profile-editor-field">
                            <span>昵称</span>
                            <input value={draftNickname} onChange={(event) => setDraftNickname(event.target.value)} />
                        </label>
                        <label className="profile-editor-field">
                            <span>签名</span>
                            <textarea value={draftBio} onChange={(event) => setDraftBio(event.target.value)} rows="3" />
                        </label>
                        <div className="profile-editor-actions">
                            <button type="button" onClick={() => setEditing(false)}>取消</button>
                            <button type="button" onClick={saveProfile}>保存</button>
                        </div>
                    </section>
                </div>
            )}

            {imageCrop && (
                <div className="profile-crop-backdrop">
                    <section className={`profile-crop-panel profile-crop-${imageCrop.target}`}>
                        <button className="profile-crop-back" type="button" onClick={() => setImageCrop(null)} aria-label="返回"><FiChevronLeft aria-hidden="true" /></button>
                        <div
                            className="profile-crop-stage"
                            onPointerDown={handleCropPointerDown}
                            onPointerMove={handleCropPointerMove}
                            onPointerUp={stopCropDrag}
                            onPointerCancel={stopCropDrag}
                            onWheel={handleCropWheel}
                        >
                            <img
                                src={imageCrop.src}
                                alt={`${cropSettings[imageCrop.target].label}裁剪预览`}
                                draggable="false"
                                style={{ transform: `translate(${imageCrop.x}px, ${imageCrop.y}px) scale(${imageCrop.scale})` }}
                            />
                            {imageCrop.target === 'avatar' && <i className="profile-crop-circle" aria-hidden="true" />}
                            {imageCrop.target === 'cover' && <i className="profile-crop-rect" aria-hidden="true" />}
                        </div>
                        <div className="profile-crop-footer">
                            <button type="button" onClick={saveCroppedImage}>完成</button>
                        </div>
                    </section>
                </div>
            )}

            {mediaPreview && (
                <div className="profile-preview-backdrop">
                    <section className={`profile-preview profile-preview-${mediaPreview.type}`}>
                        <button className="profile-preview-close" type="button" onClick={() => setMediaPreview(null)} aria-label="关闭"><FiX aria-hidden="true" /></button>
                        <div className="profile-preview-media">
                            {mediaPreview.src ? <img src={mediaPreview.src} alt={`${mediaPreview.title}预览`} /> : mediaPreview.fallback}
                        </div>
                    </section>
                </div>
            )}

        </div>
    );
}

function ProfileNavButton({ to, icon, title, desc }) {
    return (
        <Link to={to} className="glass-card profile-nav-button">
            <span>{icon}</span>
            <div>
                <strong>{title}</strong>
                <p>{desc}</p>
            </div>
        </Link>
    );
}
