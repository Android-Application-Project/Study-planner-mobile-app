import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebaseConfig'; 
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from 'src/utils/ThemeContext';
import { Theme } from 'src/utils/Themes';
import { FontAwesome5 } from '@expo/vector-icons';
import AppSegmentedControl from 'src/components/SegmentedControl';

export interface LeaderboardUser {
    id: string;
    username: string;
    avatar: string;
    streak: number;
    completedMinutes: number
}

export const useLeaderboard = (sortBy: 'completedMinutes' | 'streak', limitCount = 10) => {
    const [users, setUsers] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const usersRef = collection(db, 'users');
        const q = query(
            usersRef, 
            orderBy(sortBy, 'desc'),
            limit(limitCount)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leaderboardData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as LeaderboardUser[];
            
            setUsers(leaderboardData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [sortBy, limitCount]);

    return { users, loading };
};

export default function LeaderboardScreen() {
    const [activeTab, setActiveTab] = useState<'completedMinutes' | 'streak'>('completedMinutes');
    const { theme } = useTheme()
    const styles = useMemo(() => createStyles(theme), [theme]);
    const { users, loading } = useLeaderboard(activeTab);

    const selectedIndex = activeTab === 'completedMinutes' ? 0 : 1;

    const handleTabChange = (index: number) => {
        setActiveTab(index === 0 ? 'completedMinutes' : 'streak');
    };

    const renderItem = ({ item, index }: { item: LeaderboardUser, index: number }) => {
        const hours = (item.completedMinutes / 60).toFixed(1);
        return (
            <View style={styles.userCard}>
                <View style={styles.leftSection}>
                    <Text style={[styles.rankText, index < 3 && styles.topRankText]}>{index + 1}</Text>
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                    <View>
                        <Text style={styles.username}>{item.username}</Text>
                    </View>
                </View>
                
                <View style={styles.metricContainer}>
                    <Text style={styles.metricValue}>
                        {activeTab === 'completedMinutes' ? hours : item.streak}
                    </Text>
                    {activeTab === 'completedMinutes' ? (
                        <Text style={styles.coinText}>h</Text>
                    ) : (
                        <FontAwesome5 name="fire" size={18} color="#FF6B00" />
                    )}
                </View>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerArea}>
                <Text style={styles.mainTitle}>GLOBAL RANKING</Text>

                <AppSegmentedControl 
                    values={['Study Load', 'Streaks']}
                    selectedIndex={selectedIndex}
                    onChange={handleTabChange}
                    style={{ backgroundColor: '#E8EFE8' }}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#556B52" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                />
            )}
        </View>
    );
}

const createStyles = (theme: Theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 20 },
    headerContainer: {
        marginTop: 20,
        marginBottom: 20,
        alignItems: 'center', 
        justifyContent: 'center', 
    },
    headerTitle: { 
        fontSize: 22, 
        fontWeight: 'bold', 
        color: theme.colors.text, 
        textAlign: 'center',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 15,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
    },
    leftSection: { flexDirection: 'row', alignItems: 'center' },
    rankText: { fontSize: 16, fontWeight: 'bold', color: '#A8C2A0', width: 25 },
    avatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15, backgroundColor: '#eee' },
    username: { fontSize: 16, fontWeight: '600', color: '#333' },
    streakText: { fontSize: 12, color: '#888' },
    coinBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#FDF7E2', 
        paddingHorizontal: 10, 
        paddingVertical: 5, 
        borderRadius: 12 
    },
    coinText: { marginLeft: 5, fontWeight: 'bold', color: theme.colors.primary },
    headerArea: {
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 10,
    },
    mainTitle: { 
        fontSize: 22, 
        fontWeight: '900', 
        color: theme.colors.text, 
        letterSpacing: 1.5,
        marginBottom: 20 
    },
    pillContainer: {
        flexDirection: 'row',
        backgroundColor: '#E8EFE8',
        borderRadius: 25,
        padding: 4,
        marginBottom: 10,
    },
    pill: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 21,
    },
    activePill: {
        backgroundColor: '#556B52',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        elevation: 3,
    },
    pillText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#556B52',
    },
    activePillText: {
        color: '#FFFFFF',
    },
    topRankText: { color: '#556B52' },
    subtext: { fontSize: 11, color: '#999' },
    metricContainer: { flexDirection: 'row', alignItems: 'center' },
    metricValue: { fontSize: 17, fontWeight: 'bold', color: theme.colors.text, marginRight: 4 },
});