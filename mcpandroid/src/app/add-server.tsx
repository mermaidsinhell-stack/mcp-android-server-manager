/**
 * Add Server Screen
 *
 * Add a new MCP server from GitHub
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useServerStore } from '../stores/serverStore';
import { GitHubRepo } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS, COMPONENTS } from '../theme';
import { validateGitUrl } from '../utils/security';
import { validateGitHubRepo, getValidationErrors, validateRepoStatus, GitHubRepoResponse } from '../utils/schemas';
import { fetchGitHubAPI, validateResponse } from '../utils/network';

export default function AddServerScreen() {
  const router = useRouter();
  const { addServer, isLoading } = useServerStore();

  const [repoUrl, setRepoUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [repoInfo, setRepoInfo] = useState<GitHubRepo | null>(null);

  const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
    // Handle various GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/\s#?]+)/,
      /^([^\/]+)\/([^\/\s]+)$/,
    ];

    for (const pattern of patterns) {
      const match = url.trim().match(pattern);
      if (match) {
        return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
      }
    }
    return null;
  };

  const validateRepo = async () => {
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      Alert.alert('Invalid URL', 'Please enter a valid GitHub repository URL or owner/repo format.');
      return;
    }

    setIsValidating(true);
    try {
      // Validate URL format and security
      const urlValidation = validateGitUrl(`https://github.com/${parsed.owner}/${parsed.repo}`);
      if (!urlValidation.valid) {
        throw new Error(urlValidation.error || 'Invalid repository URL');
      }

      // Fetch from GitHub API with rate limiting
      const response = await fetchGitHubAPI(`/repos/${parsed.owner}/${parsed.repo}`);
      const data: unknown = await validateResponse(response);

      // Validate response schema
      if (!validateGitHubRepo(data)) {
        const errors = getValidationErrors(validateGitHubRepo);
        throw new Error(`Invalid repository data: ${errors}`);
      }

      const githubRepo = data as GitHubRepoResponse;

      // Validate repository status
      const statusValidation = validateRepoStatus(githubRepo);
      if (!statusValidation.valid) {
        throw new Error(statusValidation.error);
      }

      // Create validated repo object
      const repo: GitHubRepo = {
        name: githubRepo.name,
        fullName: githubRepo.full_name,
        description: githubRepo.description || 'No description provided',
        url: urlValidation.sanitized || githubRepo.clone_url,
        defaultBranch: githubRepo.default_branch,
        stars: githubRepo.stargazers_count,
        language: githubRepo.language || 'Unknown',
      };

      setRepoInfo(repo);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not find repository';
      Alert.alert('Error', errorMessage);
      setRepoInfo(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleAddServer = async () => {
    if (!repoInfo) return;

    try {
      await addServer(repoInfo);
      router.back();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to add server'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Instructions */}
          <View style={styles.section}>
            <Text
              style={styles.sectionTitle}
              accessibilityRole="header"
            >
              ADD MCP SERVER
            </Text>
            <Text style={styles.sectionText}>
              Enter a GitHub repository URL containing an MCP server.
              The server will be cloned and ready to run.
            </Text>
          </View>

          {/* URL Input */}
          <View style={styles.section}>
            <Text
              style={styles.label}
              accessibilityRole="header"
            >
              GITHUB REPOSITORY
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="owner/repo or https://github.com/..."
                placeholderTextColor={COLORS.gray}
                value={repoUrl}
                onChangeText={setRepoUrl}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                accessibilityLabel="GitHub repository URL"
                accessibilityHint="Enter a GitHub repository in the format owner/repo or full URL"
                accessibilityState={{ disabled: isLoading }}
              />
              <TouchableOpacity
                style={[
                  styles.validateButton,
                  (!repoUrl || isValidating) && styles.buttonDisabled,
                ]}
                onPress={validateRepo}
                disabled={!repoUrl || isValidating}
                accessibilityRole="button"
                accessibilityLabel="Check repository"
                accessibilityHint="Validates the GitHub repository and fetches information"
                accessibilityState={{ disabled: !repoUrl || isValidating, busy: isValidating }}
              >
                {isValidating ? (
                  <ActivityIndicator color={COLORS.white} size="small" accessibilityElementsHidden={true} />
                ) : (
                  <Text style={styles.validateButtonText} accessibilityElementsHidden={true}>CHECK</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Repository Info */}
          {repoInfo && (
            <View
              style={styles.repoCard}
              accessible={true}
              accessibilityRole="summary"
              accessibilityLabel={`Repository found: ${repoInfo.name}, ${repoInfo.stars} stars, ${repoInfo.language}, ${repoInfo.description || 'No description'}`}
            >
              <View style={styles.repoHeader}>
                <Text
                  style={styles.repoName}
                  accessibilityRole="header"
                  accessibilityElementsHidden={true}
                >
                  {repoInfo.name}
                </Text>
                <View
                  style={styles.starBadge}
                  accessible={true}
                  accessibilityLabel={`${repoInfo.stars} stars`}
                  accessibilityElementsHidden={true}
                >
                  <Text style={styles.starText} accessibilityElementsHidden={true}>★ {repoInfo.stars}</Text>
                </View>
              </View>

              <Text style={styles.repoDescription} accessibilityElementsHidden={true}>
                {repoInfo.description || 'No description'}
              </Text>

              <View style={styles.divider} accessibilityElementsHidden={true} />

              <View style={styles.repoMeta} accessibilityElementsHidden={true}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>LANGUAGE</Text>
                  <Text style={styles.metaValue}>{repoInfo.language}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>BRANCH</Text>
                  <Text style={styles.metaValue}>{repoInfo.defaultBranch}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.addButton, isLoading && styles.buttonDisabled]}
                onPress={handleAddServer}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel={`Add ${repoInfo.name} server`}
                accessibilityHint="Clones the repository and adds it to your server list"
                accessibilityState={{ disabled: isLoading, busy: isLoading }}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.white} size="small" accessibilityElementsHidden={true} />
                ) : (
                  <Text style={styles.addButtonText} accessibilityElementsHidden={true}>ADD SERVER</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Popular Servers */}
          <View style={styles.section}>
            <Text
              style={styles.sectionTitle}
              accessibilityRole="header"
            >
              POPULAR MCP SERVERS
            </Text>
            {POPULAR_SERVERS.map((server, index) => (
              <TouchableOpacity
                key={index}
                style={styles.popularItem}
                onPress={() => setRepoUrl(server.repo)}
                accessibilityRole="button"
                accessibilityLabel={`${server.name}: ${server.description}`}
                accessibilityHint="Fills the repository field with this popular server"
              >
                <Text style={styles.popularName} accessibilityElementsHidden={true}>{server.name}</Text>
                <Text style={styles.popularDescription} accessibilityElementsHidden={true}>{server.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const POPULAR_SERVERS = [
  {
    name: 'filesystem',
    repo: 'modelcontextprotocol/servers',
    description: 'File system access for reading/writing files',
  },
  {
    name: 'github',
    repo: 'modelcontextprotocol/servers',
    description: 'GitHub API integration for repos, issues, PRs',
  },
  {
    name: 'sqlite',
    repo: 'modelcontextprotocol/servers',
    description: 'SQLite database operations and queries',
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.black,
    marginBottom: SPACING.sm,
  },
  sectionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.black,
    marginBottom: SPACING.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  input: {
    ...COMPONENTS.input,
    flex: 1,
  },
  validateButton: {
    ...COMPONENTS.button,
    backgroundColor: COLORS.secondary,
    minWidth: 80,
  },
  validateButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
  buttonDisabled: {
    backgroundColor: COLORS.lightGray,
  },
  repoCard: {
    ...COMPONENTS.card,
    marginBottom: SPACING.xl,
  },
  repoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  repoName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.black,
  },
  starBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: BORDERS.width,
    borderColor: COLORS.black,
  },
  starText: {
    ...TYPOGRAPHY.label,
    color: COLORS.black,
  },
  repoDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray,
  },
  divider: {
    height: BORDERS.width,
    backgroundColor: COLORS.black,
    marginVertical: SPACING.md,
  },
  repoMeta: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  metaItem: {
    marginRight: SPACING.xl,
  },
  metaLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.gray,
    marginBottom: 2,
  },
  metaValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.black,
    fontWeight: '600',
  },
  addButton: {
    ...COMPONENTS.button,
    backgroundColor: COLORS.primary,
    width: '100%',
  },
  addButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
  popularItem: {
    ...COMPONENTS.card,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  popularName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.black,
    marginBottom: SPACING.xs,
  },
  popularDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.gray,
  },
});
