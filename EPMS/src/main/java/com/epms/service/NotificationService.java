package com.epms.service;

// added KHN ( ChatGPT)
public interface NotificationService {
    void send(Integer userId, String title, String message, String type);

    void send(Integer userId, String title, String message, String type, Integer referenceId);

    boolean sendOnce(Integer userId, String title, String message, String type);

    boolean sendOnce(Integer userId, String title, String message, String type, Integer referenceId);
}
