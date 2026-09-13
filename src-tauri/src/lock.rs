use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use std::sync::{Arc, Mutex};
use std::time::Instant;

pub struct LockManager {
    pub is_locked: bool,
    pub last_activity: Instant,
}

pub type SharedLockManager = Arc<Mutex<LockManager>>;

impl LockManager {
    pub fn new(locked: bool) -> Self {
        Self {
            is_locked: locked,
            last_activity: Instant::now(),
        }
    }

    pub fn record_activity(&mut self) {
        self.last_activity = Instant::now();
    }

    pub fn hash_passcode(passcode: &str) -> Result<String, String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        argon2
            .hash_password(passcode.as_bytes(), &salt)
            .map(|hash| hash.to_string())
            .map_err(|e| e.to_string())
    }

    pub fn verify_passcode(passcode: &str, hash_str: &str) -> bool {
        if let Ok(parsed_hash) = PasswordHash::new(hash_str) {
            Argon2::default()
                .verify_password(passcode.as_bytes(), &parsed_hash)
                .is_ok()
        } else {
            false
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_passcode_hashing_and_verification() {
        let passcode = "supersecret123";
        let hash = LockManager::hash_passcode(passcode).expect("hashing should succeed");
        assert!(LockManager::verify_passcode(passcode, &hash));
        assert!(!LockManager::verify_passcode("wrongpassword", &hash));
    }
}
