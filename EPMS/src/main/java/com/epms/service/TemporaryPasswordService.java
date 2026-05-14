
package com.epms.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class TemporaryPasswordService {
    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String SPECIAL = "!@#$%^&*";
    private static final String ALL = UPPER + LOWER + DIGITS + SPECIAL;
    private static final int LENGTH = 14;

    private final SecureRandom secureRandom = new SecureRandom();

    public String generate() {
        List<Character> chars = new ArrayList<>();

        chars.add(randomChar(UPPER));
        chars.add(randomChar(LOWER));
        chars.add(randomChar(DIGITS));
        chars.add(randomChar(SPECIAL));

        while (chars.size() < LENGTH) {
            chars.add(randomChar(ALL));
        }

        Collections.shuffle(chars, secureRandom);

        StringBuilder password = new StringBuilder(LENGTH);
        for (Character c : chars) {
            password.append(c);
        }

        return password.toString();
    }

    private char randomChar(String source) {
        return source.charAt(secureRandom.nextInt(source.length()));
    }
}
