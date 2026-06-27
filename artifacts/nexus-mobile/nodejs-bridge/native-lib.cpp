#include <jni.h>
#include <string>
#include <cstring>
#include <cstdlib>
#include "node.h"
#include <pthread.h>
#include <unistd.h>
#include <android/log.h>

int pipe_stdout[2];
int pipe_stderr[2];
pthread_t thread_stdout;
pthread_t thread_stderr;
const char *ADBTAG = "NEXUS-SERVER";

void *thread_stderr_func(void*) {
    ssize_t redirect_size;
    char buf[2048];
    while((redirect_size = read(pipe_stderr[0], buf, sizeof buf - 1)) > 0) {
        if(buf[redirect_size - 1] == '\n')
            --redirect_size;
        buf[redirect_size] = 0;
        __android_log_write(ANDROID_LOG_ERROR, ADBTAG, buf);
    }
    return 0;
}

void *thread_stdout_func(void*) {
    ssize_t redirect_size;
    char buf[2048];
    while((redirect_size = read(pipe_stdout[0], buf, sizeof buf - 1)) > 0) {
        if(buf[redirect_size - 1] == '\n')
            --redirect_size;
        buf[redirect_size] = 0;
        __android_log_write(ANDROID_LOG_INFO, ADBTAG, buf);
    }
    return 0;
}

int start_redirecting_stdout_stderr() {
    setvbuf(stdout, 0, _IONBF, 0);
    pipe(pipe_stdout);
    dup2(pipe_stdout[1], STDOUT_FILENO);

    setvbuf(stderr, 0, _IONBF, 0);
    pipe(pipe_stderr);
    dup2(pipe_stderr[1], STDERR_FILENO);

    if(pthread_create(&thread_stdout, 0, thread_stdout_func, 0) == -1)
        return -1;
    pthread_detach(thread_stdout);

    if(pthread_create(&thread_stderr, 0, thread_stderr_func, 0) == -1)
        return -1;
    pthread_detach(thread_stderr);

    return 0;
}

extern "C" jint JNICALL
Java_com_nexusconverter_app_NodeRunner_startNodeWithArguments(
        JNIEnv *env,
        jobject,
        jobjectArray arguments) {

    jsize argument_count = env->GetArrayLength(arguments);

    // First pass: scan for ENV:KEY=VALUE arguments and call setenv
    // Also count non-ENV arguments for node::Start
    int real_argc = 0;
    for (int i = 0; i < argument_count; i++) {
        const char* arg = env->GetStringUTFChars((jstring)env->GetObjectArrayElement(arguments, i), 0);
        if (strncmp(arg, "ENV:", 4) == 0) {
            const char* key_value = arg + 4;
            const char* eq = strchr(key_value, '=');
            if (eq != NULL) {
                size_t key_len = eq - key_value;
                char* key = (char*)malloc(key_len + 1);
                strncpy(key, key_value, key_len);
                key[key_len] = '\0';
                setenv(key, eq + 1, 1);
                __android_log_print(ANDROID_LOG_INFO, ADBTAG, "Set env: %s=%s", key, eq + 1);
                free(key);
            }
            env->ReleaseStringUTFChars((jstring)env->GetObjectArrayElement(arguments, i), arg);
        } else {
            real_argc++;
        }
    }

    // Build argv for node::Start excluding ENV: arguments
    int c_arguments_size = 0;
    for (int i = 0; i < argument_count; i++) {
        const char* arg = env->GetStringUTFChars((jstring)env->GetObjectArrayElement(arguments, i), 0);
        if (strncmp(arg, "ENV:", 4) != 0) {
            c_arguments_size += strlen(arg) + 1;
        }
        env->ReleaseStringUTFChars((jstring)env->GetObjectArrayElement(arguments, i), arg);
    }

    char* args_buffer = (char*)calloc(c_arguments_size, sizeof(char));
    char* argv[real_argc];
    char* current_args_position = args_buffer;

    int idx = 0;
    for (int i = 0; i < argument_count; i++) {
        const char* current_argument = env->GetStringUTFChars((jstring)env->GetObjectArrayElement(arguments, i), 0);
        if (strncmp(current_argument, "ENV:", 4) == 0) {
            env->ReleaseStringUTFChars((jstring)env->GetObjectArrayElement(arguments, i), current_argument);
            continue;
        }
        size_t len = strlen(current_argument);
        strncpy(current_args_position, current_argument, len);
        current_args_position[len] = '\0';
        argv[idx++] = current_args_position;
        current_args_position += len + 1;
        env->ReleaseStringUTFChars((jstring)env->GetObjectArrayElement(arguments, i), current_argument);
    }

    if (start_redirecting_stdout_stderr() == -1) {
        __android_log_write(ANDROID_LOG_ERROR, ADBTAG, "Couldn't start redirecting stdout and stderr to logcat.");
    }

    return jint(node::Start(real_argc, argv));
}
