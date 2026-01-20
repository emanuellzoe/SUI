"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'client' | 'freelancer' | 'arbiter' | null;

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  hasSelectedRole: boolean;
  clearRole: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const STORAGE_KEY = 'escrow_user_role';

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRoleState] = useState<UserRole>(null);
  const [hasSelectedRole, setHasSelectedRole] = useState(false);

  // Load role from localStorage on mount
  useEffect(() => {
    const savedRole = localStorage.getItem(STORAGE_KEY) as UserRole;
    if (savedRole && ['client', 'freelancer', 'arbiter'].includes(savedRole)) {
      setRoleState(savedRole);
      setHasSelectedRole(true);
    }
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem(STORAGE_KEY, newRole);
      setHasSelectedRole(true);
    }
  };

  const clearRole = () => {
    setRoleState(null);
    localStorage.removeItem(STORAGE_KEY);
    setHasSelectedRole(false);
  };

  return (
    <RoleContext.Provider value={{ role, setRole, hasSelectedRole, clearRole }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
