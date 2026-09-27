import React from 'react';
import { ProfileScreen, ProfileScreenProps } from './ProfileScreen';

export type ProfileViewProps = ProfileScreenProps;

export const ProfileView: React.FC<ProfileViewProps> = (props) => {
  return <ProfileScreen {...props} />;
};

export default ProfileView;
