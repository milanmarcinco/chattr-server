# API Reference

## List of all endpoints

- Register a new user
- Log in
- Renew access and refresh tokens
- Change password
- Log out
- Log out from all devices
- Delete account

---

## Register a new user

### **`POST`** `/auth/register`

This action also automatically logs in the user.

**Request attributes:**

- email: `string`
- password: `string`

**Returned data:**

- error: `null`
- accessToken: `string`
- refreshToken: `string`

OR

- error: `string`

---

## Log in

### **`POST`** `/auth/login`

**Request attributes:**

- email: `string`
- password: `string`

**Returned data:**

- error: `null`
- accessToken: `string`
- refreshToken: `string`

OR

- error: `string`

---

## Renew access and refresh tokens

### **`POST`** `/auth/renew-tokens`

**Request attributes:**

- refreshToken: `string`

**Returned data:**

- error: `null`
- accessToken: `string`
- refreshToken: `string`

OR

- error: `string`

---

## Change password

### **`PATCH`** `/auth/change-password`

This action automatically logs out all signed-in devices.

**Request attributes:**

- refreshToken: `string`
- oldPassword: `string`
- newPassword: `string`

**Returned data:**

- error: `null` OR `string`

---

## Log out

### **`DELETE`** `/auth/logout`

**Request attributes:**

- refreshToken: `string`

**Returned data:**

- error: `null` OR `string`

---

## Log out from all devices

### **`DELETE`** `/auth/logout-all`

**Request attributes:**

- refreshToken: `string`

**Returned data:**

- error: `null` OR `string`

---

## Delete account

### **`DELETE`** `/auth/delete-account`

**Request attributes:**

- refreshToken: `string`
- password: `string`

**Returned data:**

- error: `null` OR `string`
